using Azure.Monitor.OpenTelemetry.AspNetCore;
using ThadTheBarber.Api.Features.Health;
using ThadTheBarber.Api.Infrastructure;
using ThadTheBarber.Api.Infrastructure.Cors;
using ThadTheBarber.Api.Square;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddKeyVaultIfConfigured();

// Requests, outgoing HTTP, logs and metrics go to App Insights. Off when no connection string is set (local runs, tests).
if (builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"] is { Length: > 0 })
{
    builder.Services.AddOpenTelemetry().UseAzureMonitor();
}

builder.Services.AddProblemDetails();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(365));
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddSquareService(builder.Configuration);
builder.Services.AddHealth();
builder.Services.AddOpenApi();

WebApplication app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    // RFC 7807 ProblemDetails without stack traces. Development keeps the developer exception page.
    app.UseExceptionHandler();
    app.UseHsts();
}

// Unmatched routes (and other bodiless 4xx/5xx) become ProblemDetails.
app.UseStatusCodePages();
app.UseNoSniff();
app.UseCors();

RouteGroupBuilder api = app.MapGroup("/api");
api.MapHealthEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/api/openapi/{documentName}.json");
}

await app.RunAsync();
