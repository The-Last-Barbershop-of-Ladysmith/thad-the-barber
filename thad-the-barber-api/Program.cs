using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Endpoints;
using ThadTheBarber.Api.Features.Health.Configuration;
using ThadTheBarber.Api.Features.Health.Endpoints;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Endpoints;
using ThadTheBarber.Api.Features.Shop.Endpoints;
using ThadTheBarber.Api.Infrastructure.Auth.Configuration;
using ThadTheBarber.Api.Infrastructure.Cors.Configuration;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.KeyVault.Configuration;
using ThadTheBarber.Api.Infrastructure.OpenApi.Transformers;
using ThadTheBarber.Api.Infrastructure.Problems.Handlers;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Square.Configuration;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddKeyVaultIfConfigured(SquareSecrets.All);

if (builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] is { Length: > 0 })
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor();
}

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblemDetails();
builder.Services.AddValidation();
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddSquareService(builder.Configuration);
builder.Services.AddRecaptcha(builder.Configuration);
builder.Services.AddSessionTokens(builder.Configuration);
builder.Services.AddSessionBearerAuth();
builder.Services.AddHealth();
builder.Services.AddBooking(builder.Configuration);
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecurityTransformer>();
    options.AddOperationTransformer<BearerSecurityTransformer>();
});
builder.Services.AddSwaggerGen();

WebApplication app = builder.Build();

// Every environment, so Square failures reach callers as ProblemDetails (dev included; the booking fallback needs them).
// .NET 10 stops logging exceptions an IExceptionHandler handles; Square failures should still be errors in telemetry,
// while ProblemExceptions are expected outcomes their handler logs itself.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    SuppressDiagnosticsCallback = context => context.Exception is ProblemException,
});
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseStatusCodePages();
app.UseNoSniff();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

RouteGroupBuilder api = app.MapGroup("/api").RequireAuthorization();
api.MapSessionEndpoints();
api.MapHealthEndpoints();
api.MapShopEndpoints();
api.MapBookingEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/api/openapi/{documentName}.json");
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/api/openapi/v1.json", "Thad the Barber API");
        options.RoutePrefix = string.Empty;
    });
}

await app.RunAsync();
