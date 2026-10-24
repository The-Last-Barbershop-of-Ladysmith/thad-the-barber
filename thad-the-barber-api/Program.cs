using System.Text.Json;
using System.Text.Json.Serialization;
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
using ThadTheBarber.Api.Infrastructure.Problems.Configuration;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;
using ThadTheBarber.Api.Infrastructure.Telemetry.Configuration;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Endpoints;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddKeyVaultIfConfigured(SquareSecrets.All);

builder.AddTelemetry();
// The largest body is a Square webhook, capped in characters; UTF-8 takes up to 4 bytes per character.
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = SquareWebhookEndpoints.MaxBodyLength * 4);
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
});
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblems();
builder.Services.AddValidation();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddRateLimits(builder.Configuration);
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
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

RouteGroupBuilder api = app.MapGroup("/api").RequireAuthorization();
api.MapSessionEndpoints();
api.MapHealthEndpoints();
api.MapShopEndpoints();
api.MapBookingEndpoints();
api.MapSquareWebhookEndpoints();

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
