using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Exceptions;
using ThadTheBarber.Api.Features.Admin.Models;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Admin.Services;

public sealed class GoogleIdTokenValidatorTests
{
    private static readonly DateTimeOffset now = new(2031, 2, 28, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeGoogleSigningKeys _googleKeys = new();

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ATokenMadeForOurClientIsAcceptedWithItsEmailAndSubject()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, expires: now.UtcDateTime.AddMinutes(20));

        GoogleIdentity identity = await CreateValidator().ValidateAsync(token, Cancellation);

        Assert.Equal(AdminHarness.AllowedEmail, identity.Email);
        Assert.Equal("google-subject-1", identity.Subject);
    }

    [Fact]
    public async Task TheNameGoogleGivesIsKeptWithoutItsSpaces()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, name: "  Q. Testperson ", expires: now.UtcDateTime.AddMinutes(20));

        GoogleIdentity identity = await CreateValidator().ValidateAsync(token, Cancellation);

        Assert.Equal(AdminHarness.AllowedName, identity.Name);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task ATokenWithoutAUsableNameStillSignsInWithNoName(string? name)
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, name: name, expires: now.UtcDateTime.AddMinutes(20));

        GoogleIdentity identity = await CreateValidator().ValidateAsync(token, Cancellation);

        Assert.Equal(AdminHarness.AllowedEmail, identity.Email);
        Assert.Null(identity.Name);
    }

    [Theory]
    [InlineData("https://accounts.google.com")]
    [InlineData("accounts.google.com")]
    public async Task BothOfGooglesIssuerSpellingsAreAccepted(string issuer)
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, issuer: issuer, expires: now.UtcDateTime.AddMinutes(20));

        GoogleIdentity identity = await CreateValidator().ValidateAsync(token, Cancellation);

        Assert.Equal(AdminHarness.AllowedEmail, identity.Email);
    }

    [Fact]
    public async Task ATokenMadeForAnotherAppIsRefused()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, audience: "another-app.apps.example.com", expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task ATokenFromAnotherIssuerIsRefused()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, issuer: "https://evil.example.com", expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task AnExpiredTokenIsRefused()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, expires: now.UtcDateTime.AddMinutes(-10));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task ATokenNotYetValidIsRefused()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, expires: now.UtcDateTime.AddHours(3));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task ATokenGoogleDidNotSignIsRefused()
    {
        FakeGoogleSigningKeys forger = new();
        string token = GoogleIdTokens.Create(forger.Key, expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Theory]
    [InlineData(false)]
    [InlineData("false")]
    public async Task AnUnverifiedEmailIsRefused(object emailVerified)
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, emailVerified: emailVerified, expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task AVerifiedFlagSentAsTextIsAccepted()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, emailVerified: "true", expires: now.UtcDateTime.AddMinutes(20));

        GoogleIdentity identity = await CreateValidator().ValidateAsync(token, Cancellation);

        Assert.Equal(AdminHarness.AllowedEmail, identity.Email);
    }

    [Fact]
    public async Task ATokenWithNoEmailIsRefused()
    {
        string token = GoogleIdTokens.Create(_googleKeys.Key, includeEmail: false, expires: now.UtcDateTime.AddMinutes(20));

        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync(token, Cancellation));
    }

    [Fact]
    public async Task SomethingThatIsNotATokenIsRefused()
    {
        await Assert.ThrowsAsync<InvalidIdTokenException>(() => CreateValidator().ValidateAsync("not-a-jwt", Cancellation));
    }

    [Fact]
    public async Task GoogleBeingUnreachableIsRefusedWithTheCauseKept()
    {
        HttpRequestException unreachable = new("Google is down.");
        string token = GoogleIdTokens.Create(_googleKeys.Key, expires: now.UtcDateTime.AddMinutes(20));

        InvalidIdTokenException refused = await Assert.ThrowsAsync<InvalidIdTokenException>(
            () => CreateValidator(new FakeGoogleSigningKeys { Failure = unreachable }).ValidateAsync(token, Cancellation));

        Assert.Same(unreachable, refused.InnerException);
    }

    private GoogleIdTokenValidator CreateValidator(FakeGoogleSigningKeys? keys = null) =>
        new(
            keys ?? _googleKeys,
            new FakeTimeProvider(now),
            Options.Create(new AdminSettings
            {
                GoogleClientId = AdminHarness.GoogleClientId,
            })
        );
}
