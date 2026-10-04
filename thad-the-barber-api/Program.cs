using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using ThadTheBarber.Api.Features.Health.Endpoints;
using ThadTheBarber.Api.Infrastructure.Cors.Configuration;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.KeyVault.Configuration;
using ThadTheBarber.Api.Square.Configuration;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.AddKeyVaultIfConfigured(SquareSecrets.All);

if (builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] is { Length: > 0 })
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor();
}

builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddProblemDetails();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddSquareService(builder.Configuration);
builder.Services.AddHealth();
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();

WebApplication app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseStatusCodePages();
app.UseNoSniff();
app.UseCors();

RouteGroupBuilder api = app.MapGroup("/api");
api.MapHealthEndpoints();

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
