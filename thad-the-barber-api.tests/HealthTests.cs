using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ThadTheBarber.Api.Tests;

public sealed class HealthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task HealthReturnsStatusVersionAndCommit()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("ok", body.GetProperty("status").GetString());
        Assert.Equal("1.0.0", body.GetProperty("version").GetString());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("commit").GetString()));
        Assert.False(body.TryGetProperty("square", out _));
    }

    [Fact]
    public async Task HealthIsNeverCached()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health", TestContext.Current.CancellationToken);

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task DeepHealthReportsSquareReachable()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("reachable", body.GetProperty("square").GetString());
    }

    [Fact]
    public async Task DeepHealthIs503WhenSquareIsUnreachable()
    {
        using ApiFactory unreachable = new(squareReachable: false);

        using HttpResponseMessage response = await unreachable.CreateClient().GetAsync("/api/health?deep=true", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("degraded", body.GetProperty("status").GetString());
        Assert.Equal("unreachable", body.GetProperty("square").GetString());
    }
}
