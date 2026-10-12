using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Problems.Configuration;

public sealed class ProblemsSetupTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task ValidationFailureIsValidationFailed()
    {
        using HttpResponseMessage response = await factory.CreateClient().PostAsJsonAsync(
            "/api/bookings",
            new
            {
                startAt = "2031-02-03T15:00:00Z",
                name = "Q",
                phone = "12",
                idempotencyKey = Guid.NewGuid(),
            },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 400, "validation_failed");
    }

    [Fact]
    public async Task EndpointValidationProblemIsValidationFailed()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/bookings/availability?month=13-2031", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 400, "validation_failed");
    }

    [Fact]
    public async Task MissingTokenIsUnauthorized()
    {
        using HttpResponseMessage response = await factory.CreateClientWithoutToken().GetAsync("/api/shop", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 401, "unauthorized");
    }

    [Fact]
    public async Task UnknownRouteIsNotFound()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/nope", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 404, "not_found");
    }

    [Fact]
    public async Task WrongMethodIsMethodNotAllowed()
    {
        using HttpResponseMessage response = await factory.CreateClient().DeleteAsync("/api/shop", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 405, "method_not_allowed");
    }

    [Fact]
    public async Task UnhandledErrorIsInternalError()
    {
        using WebApplicationFactory<Program> throwing = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services => services.AddSingleton<IStartupFilter, ThrowFilter>()));

        using HttpResponseMessage response = await throwing.CreateClient().GetAsync("/api/throw", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, 500, "internal_error");
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, int expectedStatus, string expectedCode)
    {
        Assert.Equal(expectedStatus, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("type").GetString()));
        Assert.False(string.IsNullOrEmpty(body.GetProperty("title").GetString()));
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.Equal(expectedCode, body.GetProperty("code").GetString());
    }

    /// <summary>Adds a terminal middleware after the app's pipeline, so its exception reaches the default handler.</summary>
    private sealed class ThrowFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Run(_ => throw new InvalidOperationException("thrown by a test"));
        };
    }
}
