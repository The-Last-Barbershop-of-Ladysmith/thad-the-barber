using System.Net.Http.Json;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Headers;

public sealed class ErrorAndHeaderTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task UnknownRouteIs404ProblemDetails()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/nope", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(404, body.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task UnhandledErrorIs500ProblemDetailsWithoutAStackTrace()
    {
        using WebApplicationFactory<Program> throwing = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services => services.AddSingleton<IStartupFilter, ThrowOnBoomFilter>()));

        using HttpResponseMessage response = await throwing.CreateClient().GetAsync("/api/boom", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        string body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.DoesNotContain("boom from a test", body, StringComparison.Ordinal);
        Assert.DoesNotContain("ThrowOnBoomFilter", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/nope")]
    public async Task EveryResponseIsNoSniff(string path)
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync(path, TestContext.Current.CancellationToken);

        Assert.Equal("nosniff", Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));
    }

    [Fact]
    public async Task HttpsResponsesCarryHsts()
    {
        using HttpClient client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://api.test") });

        using HttpResponseMessage response = await client.GetAsync("/api/health", TestContext.Current.CancellationToken);

        Assert.StartsWith("max-age=31536000", Assert.Single(response.Headers.GetValues("Strict-Transport-Security")), StringComparison.Ordinal);
    }

    /// <summary>Adds a terminal middleware after the app's pipeline, so /api/boom throws inside the exception handler.</summary>
    private sealed class ThrowOnBoomFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Run(context => context.Request.Path == "/api/boom"
                ? throw new InvalidOperationException("boom from a test")
                : Task.CompletedTask);
        };
    }
}
