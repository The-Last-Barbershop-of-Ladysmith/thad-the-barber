using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.Fakes;

namespace ThadTheBarber.Api.Tests;

public sealed class HealthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task HealthReturnsStatusVersionAndCommit()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("healthy", body.GetProperty("status").GetString());
        Assert.Equal("1.0.0", body.GetProperty("version").GetString());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("commit").GetString()));
        Assert.False(body.TryGetProperty("checks", out _));
    }

    [Fact]
    public async Task HealthIsNeverCached()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health", TestContext.Current.CancellationToken);

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task DeepHealthReportsSquareConnected()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("healthy", body.GetProperty("status").GetString());
        Assert.Equal("healthy", body.GetProperty("checks").GetProperty("square").GetString());
        Assert.Equal("healthy", body.GetProperty("checks").GetProperty("bookableService").GetString());
    }

    [Fact]
    public async Task DeepHealthIs503AndLogsAnErrorWhenTheCatalogHasSeveralBookableServices()
    {
        using ApiFactory ambiguous = new(square: new FakeSquareService
        {
            BookableServices = FakeSquareService.TwoBookableServices,
        });
        using WebApplicationFactory<Program> logged = ambiguous.WithFakeLogging();

        using HttpResponseMessage response = await logged.CreateClient().GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("healthy", body.GetProperty("checks").GetProperty("square").GetString());
        Assert.Equal("unhealthy", body.GetProperty("checks").GetProperty("bookableService").GetString());
        Assert.Contains(
            logged.Services.GetFakeLogCollector().GetSnapshot(),
            record => record.Level == LogLevel.Error && record.Exception is BookableServiceNotResolvedException);
    }

    [Fact]
    public async Task DeepHealthReusesTheSquareResultForRepeatedProbes()
    {
        FakeSquareService square = new();
        using ApiFactory probed = new(square: square);
        using HttpClient client = probed.CreateClient();

        await client.GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);
        await client.GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(1, square.Checks);
    }

    [Fact]
    public async Task DeepHealthReusesAFailedBookableServiceLookupForRepeatedProbes()
    {
        FakeSquareService square = new()
        {
            BookableServices = [],
        };
        using ApiFactory probed = new(square: square);
        using HttpClient client = probed.CreateClient();

        await client.GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);
        await client.GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(1, square.CatalogSearches);
    }

    [Theory]
    [InlineData(SquareConnection.NotConnected)]
    [InlineData(SquareConnection.Unreachable)]
    public async Task DeepHealthIs503WhenSquareIsNotUsable(SquareConnection connection)
    {
        using ApiFactory notUsable = new(square: new FakeSquareService { Connection = connection });

        using HttpResponseMessage response = await notUsable.CreateClient().GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("unhealthy", body.GetProperty("status").GetString());
        Assert.Equal("unhealthy", body.GetProperty("checks").GetProperty("square").GetString());
    }
}
