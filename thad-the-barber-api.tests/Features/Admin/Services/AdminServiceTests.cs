using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Exceptions;
using ThadTheBarber.Api.Features.Admin.Models;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Admin.Services;

public sealed class AdminServiceTests
{
    private static readonly DateTimeOffset now = new(2031, 2, 28, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeGoogleSigningKeys _googleKeys = new();
    private readonly FakeLogger<AdminService> _logger = new();

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("owner@example.com")]
    [InlineData("Owner@Example.COM")]
    public async Task AnAllowedAccountGetsASessionWhateverTheCaseOfItsEmail(string allowed)
    {
        AdminService service = CreateService(allowed);

        AdminSession session = await service.SignInAsync(ValidIdToken(), Cancellation);

        Assert.False(string.IsNullOrEmpty(session.Token));
        Assert.Equal(AdminHarness.AllowedEmail, session.Email);
    }

    [Fact]
    public async Task AnAccountNotOnTheAllowlistIsRefused()
    {
        AdminService service = CreateService(AdminHarness.OtherEmail);

        await Assert.ThrowsAsync<AdminNotAuthorizedException>(() => service.SignInAsync(ValidIdToken(), Cancellation));
    }

    [Theory]
    [InlineData(null, "owner@example.com")]
    [InlineData("", "owner@example.com")]
    [InlineData(AdminHarness.GoogleClientId, null)]
    [InlineData(AdminHarness.GoogleClientId, "")]
    public async Task WithoutAClientIdOrAnyAllowedEmailNobodyCanSignIn(string? clientId, string? allowed)
    {
        AdminService service = CreateService(allowed, clientId);

        await Assert.ThrowsAsync<AdminUnavailableException>(() => service.SignInAsync(ValidIdToken(), Cancellation));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ARequestWithNoIdTokenIsRefused(string? idToken)
    {
        AdminService service = CreateService(AdminHarness.AllowedEmail);

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => service.SignInAsync(idToken, Cancellation));
    }

    [Fact]
    public async Task ASignInIsLoggedWithTheEmailMasked()
    {
        AdminService service = CreateService(AdminHarness.AllowedEmail);

        await service.SignInAsync(ValidIdToken(), Cancellation);

        FakeLogRecord record = Assert.Single(_logger.Collector.GetSnapshot());
        Assert.Equal(LogLevel.Information, record.Level);
        Assert.Equal("Admin signed in: o***@e***.com.", record.Message);
    }

    [Fact]
    public async Task ADenialIsLoggedAsAWarningWithTheEmailMasked()
    {
        AdminService service = CreateService(AdminHarness.AllowedEmail);
        string token = GoogleIdTokens.Create(_googleKeys.Key, email: AdminHarness.OtherEmail, expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<AdminNotAuthorizedException>(() => service.SignInAsync(token, Cancellation));

        FakeLogRecord record = Assert.Single(_logger.Collector.GetSnapshot());
        Assert.Equal(LogLevel.Warning, record.Level);
        Assert.Equal("Admin sign-in denied for s***@e***.com.", record.Message);
    }

    [Fact]
    public void TheConfigIsTheGoogleClientId()
    {
        AdminService service = CreateService(AdminHarness.AllowedEmail);

        Assert.Equal(AdminHarness.GoogleClientId, service.GetConfig().GoogleClientId);
    }

    [Fact]
    public void WithoutAClientIdThereIsNoConfig()
    {
        AdminService service = CreateService(AdminHarness.AllowedEmail, clientId: null);

        Assert.Throws<AdminUnavailableException>(() => service.GetConfig());
    }

    [Theory]
    [InlineData("jordan@example.com", "j***@e***.com")]
    [InlineData("a@b.co", "a***@b***.co")]
    [InlineData("no-at-sign", "***")]
    [InlineData("@example.com", "***")]
    [InlineData("name@nodot", "***")]
    public void AnEmailIsMaskedToItsFirstLetterAndItsEnding(string email, string expected)
    {
        Assert.Equal(expected, AdminService.MaskEmail(email));
    }

    private string ValidIdToken() =>
        GoogleIdTokens.Create(_googleKeys.Key, expires: now.UtcDateTime.AddMinutes(20));

    private AdminService CreateService(string? allowedEmail, string? clientId = AdminHarness.GoogleClientId)
    {
        AdminSettings settings = new()
        {
            GoogleClientId = clientId,
        };
        if (allowedEmail is not null)
        {
            settings.AllowedEmails.Add(allowedEmail);
        }

        FakeTimeProvider time = new(now);
        IOptions<AdminSettings> options = Options.Create(settings);
        return new AdminService(
            new GoogleIdTokenValidator(_googleKeys, time, options),
            new AdminTokenIssuer(new FakeSessionSigningKey(), time, options),
            options,
            _logger
        );
    }
}
