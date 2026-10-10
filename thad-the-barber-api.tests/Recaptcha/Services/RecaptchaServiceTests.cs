using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Recaptcha.Models;
using ThadTheBarber.Api.Recaptcha.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Recaptcha.Services;

public sealed class RecaptchaServiceTests
{
    private const string ApiKey = "fake-api-key";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AssessPostsTheTokenSiteKeyAndActionToTheProjectsAssessments()
    {
        FakeRecaptchaHttp google = new();

        await CreateService(google).AssessAsync("token-1", "session", Cancellation);

        Assert.Equal(HttpMethod.Post, google.Request!.Method);
        Assert.Equal("https://google.example/v1/projects/project%2F1/assessments", google.Request.RequestUri!.AbsoluteUri);
        JsonElement assessmentEvent = JsonDocument.Parse(google.RequestBody!).RootElement.GetProperty("event");
        Assert.Equal("token-1", assessmentEvent.GetProperty("token").GetString());
        Assert.Equal("site-key-1", assessmentEvent.GetProperty("siteKey").GetString());
        Assert.Equal("session", assessmentEvent.GetProperty("expectedAction").GetString());
    }

    [Fact]
    public async Task AssessSendsTheApiKeyInAHeaderNotTheUrl()
    {
        FakeRecaptchaHttp google = new();

        await CreateService(google).AssessAsync("token-1", "session", Cancellation);

        Assert.Equal([ApiKey], google.Request!.Headers.GetValues("X-Goog-Api-Key"));
        Assert.DoesNotContain(ApiKey, google.Request.RequestUri!.AbsoluteUri, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AssessReturnsGooglesVerdict()
    {
        FakeRecaptchaHttp google = new()
        {
            Body = """{"tokenProperties":{"valid":false,"invalidReason":"DUPE","hostname":"other.example","action":"login"},"riskAnalysis":{"score":0.3}}""",
        };

        RecaptchaAssessment assessment = await CreateService(google).AssessAsync("token-1", "session", Cancellation);

        Assert.Equal(new RecaptchaAssessment(
            IsValid: false,
            InvalidReason: "DUPE",
            Action: "login",
            Hostname: "other.example",
            Score: 0.3
        ), assessment);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task AssessThrowsWhenGoogleRefuses(HttpStatusCode status)
    {
        FakeRecaptchaHttp google = new()
        {
            Status = status,
            Body = """{"error":{"code":403}}""",
        };

        await Assert.ThrowsAsync<HttpRequestException>(() => CreateService(google).AssessAsync("token-1", "session", Cancellation));
    }

    [Fact]
    public async Task AssessThrowsOnAnEmptyJsonBody()
    {
        FakeRecaptchaHttp google = new()
        {
            Body = "null",
        };

        await Assert.ThrowsAsync<HttpRequestException>(() => CreateService(google).AssessAsync("token-1", "session", Cancellation));
    }

    private static RecaptchaService CreateService(FakeRecaptchaHttp google) =>
        new(
            new HttpClient(google) { BaseAddress = new Uri("https://google.example/") },
            Options.Create(new RecaptchaSettings
            {
                ProjectId = "project/1",
                SiteKey = "site-key-1",
                ApiKey = ApiKey,
            })
        );
}
