using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Session.Endpoints;

public sealed class SessionEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task APassingVisitorGetsATokenThatOpensTheApi()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClientWithoutToken();

        using HttpResponseMessage response = await client.SendAsync(SessionRequest(ApiFactory.FrontendOrigin, """{"recaptchaToken":"token-1"}"""), Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.True(body.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.GetProperty("token").GetString());
        using HttpResponseMessage shop = await client.GetAsync("/api/shop", Cancellation);
        Assert.Equal(HttpStatusCode.OK, shop.StatusCode);
    }

    [Fact]
    public async Task ALowScoreIs403BotCheckFailed()
    {
        using ApiFactory api = new(recaptcha: new FakeRecaptchaService
        {
            Assessment = FakeRecaptchaService.Pass with { Score = 0.1 },
        });

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(SessionRequest(ApiFactory.FrontendOrigin, """{"recaptchaToken":"token-1"}"""), Cancellation);

        await AssertProblemAsync(response, "bot_check_failed");
    }

    [Theory]
    [InlineData("")]
    [InlineData("{}")]
    [InlineData("""{"recaptchaToken":null}""")]
    public async Task AMissingRecaptchaTokenIs403BotCheckFailed(string body)
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(SessionRequest(ApiFactory.FrontendOrigin, body), Cancellation);

        await AssertProblemAsync(response, "bot_check_failed");
    }

    [Fact]
    public async Task ANewThresholdInConfigurationApplies()
    {
        using ApiFactory api = new();
        using WebApplicationFactory<Program> strict = api.WithWebHostBuilder(builder => builder.UseSetting("Recaptcha:MinScore", "0.95"));

        using HttpResponseMessage response = await strict.CreateClient().SendAsync(SessionRequest(ApiFactory.FrontendOrigin, """{"recaptchaToken":"token-1"}"""), Cancellation);

        await AssertProblemAsync(response, "bot_check_failed");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("https://evil.example")]
    public async Task ARequestFromOutsideTheSiteIs403OriginNotAllowed(string? origin)
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(SessionRequest(origin, """{"recaptchaToken":"token-1"}"""), Cancellation);

        await AssertProblemAsync(response, "origin_not_allowed");
    }

    private static HttpRequestMessage SessionRequest(string? origin, string body)
    {
        HttpRequestMessage request = new(HttpMethod.Post, "/api/session")
        {
            Content = new StringContent(body, MediaTypeHeaderValue.Parse("application/json")),
        };
        if (origin is not null)
        {
            request.Headers.Add("Origin", origin);
        }

        return request;
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, string code)
    {
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
