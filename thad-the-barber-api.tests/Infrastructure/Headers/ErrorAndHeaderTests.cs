using Microsoft.AspNetCore.Mvc.Testing;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Headers;

public sealed class ErrorAndHeaderTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
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
}
