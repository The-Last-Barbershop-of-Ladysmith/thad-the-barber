using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Exceptions;
using ThadTheBarber.Api.Features.Session.Models;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Infrastructure.Cors.Configuration;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Recaptcha.Exceptions;
using ThadTheBarber.Api.Recaptcha.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Session.Services;

public sealed class SessionServiceTests
{
    private const string Token = "recaptcha-token-1";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task APassingVisitorGetsASessionToken()
    {
        FakeRecaptchaService recaptcha = new();

        SessionToken session = await CreateService(recaptcha).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation);

        Assert.NotEmpty(session.Token);
        Assert.Equal([Token], recaptcha.Tokens);
    }

    public static TheoryData<RecaptchaAssessment> FailingAssessments() =>
    [
        FakeRecaptchaService.Pass with { IsValid = false, InvalidReason = "EXPIRED" },
        FakeRecaptchaService.Pass with { Action = "login" },
        FakeRecaptchaService.Pass with { Action = null },
        FakeRecaptchaService.Pass with { Hostname = "evil.example" },
        FakeRecaptchaService.Pass with { Hostname = null },
        FakeRecaptchaService.Pass with { Score = 0.49 },
        FakeRecaptchaService.Pass with { Score = 0 },
    ];

    [Theory]
    [MemberData(nameof(FailingAssessments))]
    public async Task AnInvalidTokenWrongActionWrongHostOrLowScoreFailsTheBotCheck(RecaptchaAssessment assessment)
    {
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = assessment,
        };

        await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation));
    }

    [Fact]
    public async Task AScoreExactlyAtTheThresholdPasses()
    {
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = FakeRecaptchaService.Pass with { Score = 0.5 },
        };

        SessionToken session = await CreateService(recaptcha).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation);

        Assert.NotEmpty(session.Token);
    }

    [Fact]
    public async Task TheThresholdComesFromSettings()
    {
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = FakeRecaptchaService.Pass with { Score = 0.7 },
        };

        await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha, minScore: 0.8).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation));
    }

    [Theory]
    [InlineData(ApiFactory.CustomDomainOrigin, "www.example.com")]
    [InlineData(ApiFactory.CustomDomainOrigin, "WWW.Example.COM")]
    [InlineData("HTTPS://APP.EXAMPLE.COM", "app.example.com")]
    public async Task TheTokenMustComeFromTheRequestsOwnHost(string origin, string hostname)
    {
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = FakeRecaptchaService.Pass with { Hostname = hostname },
        };

        SessionToken session = await CreateService(recaptcha).StartAsync(origin, Token, Cancellation);

        Assert.NotEmpty(session.Token);
    }

    [Fact]
    public async Task ATokenMadeOnAnotherAllowedSiteFails()
    {
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = FakeRecaptchaService.Pass with { Hostname = "app.example.com" },
        };

        await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha).StartAsync(ApiFactory.CustomDomainOrigin, Token, Cancellation));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task AMissingTokenFailsWithoutAskingGoogle(string? token)
    {
        FakeRecaptchaService recaptcha = new();

        await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha).StartAsync(ApiFactory.FrontendOrigin, token, Cancellation));
        Assert.Empty(recaptcha.Tokens);
    }

    [Theory]
    [InlineData("")]
    [InlineData("https://evil.example")]
    [InlineData("http://app.example.com")]
    [InlineData("https://app.example.com:8443")]
    [InlineData("https://app.example.com/")]
    [InlineData("https://app.example.com, https://evil.example")]
    [InlineData("null")]
    public async Task AnOriginOutsideTheAllowListIsRefusedWithoutAskingGoogle(string origin)
    {
        FakeRecaptchaService recaptcha = new();

        await Assert.ThrowsAsync<OriginNotAllowedException>(() => CreateService(recaptcha).StartAsync(origin, Token, Cancellation));
        Assert.Empty(recaptcha.Tokens);
    }

    [Fact]
    public async Task WhenGoogleCantBeAskedTheBotCheckFails()
    {
        RecaptchaUnavailableException failure = new("Google is down.", new HttpRequestException("Unreachable."));
        FakeRecaptchaService recaptcha = new()
        {
            Failure = failure,
        };

        BotCheckFailedException exception = await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation));
        Assert.Same(failure, exception.InnerException);
    }

    [Fact]
    public async Task TheScoreIsLoggedWithoutTheToken()
    {
        FakeLogger<SessionService> logger = new();
        FakeRecaptchaService recaptcha = new()
        {
            Assessment = FakeRecaptchaService.Pass with { Score = 0.3 },
        };

        await Assert.ThrowsAsync<BotCheckFailedException>(() => CreateService(recaptcha, logger: logger).StartAsync(ApiFactory.FrontendOrigin, Token, Cancellation));

        FakeLogRecord record = Assert.Single(logger.Collector.GetSnapshot());
        Assert.Equal("BotCheckScored", record.Id.Name);
        Assert.Equal("0.3", record.GetStructuredStateValue("Score"));
        Assert.DoesNotContain(Token, record.Message, StringComparison.Ordinal);
    }

    private static SessionService CreateService(
        FakeRecaptchaService recaptcha,
        double minScore = 0.5,
        FakeLogger<SessionService>? logger = null) =>
        new(
            recaptcha,
            new SessionTokenIssuer(
                new FakeSessionSigningKey(),
                new FakeTimeProvider(),
                Options.Create(new SessionSettings
                {
                    SigningKeyName = "unused",
                })
            ),
            Options.Create(new CorsSettings
            {
                AllowedOrigins = [ApiFactory.FrontendOrigin, ApiFactory.CustomDomainOrigin],
            }),
            Options.Create(new RecaptchaSettings
            {
                ProjectId = "fake-project",
                SiteKey = "fake-site-key",
                ApiKey = "fake-api-key",
                MinScore = minScore,
            }),
            logger ?? new FakeLogger<SessionService>()
        );
}
