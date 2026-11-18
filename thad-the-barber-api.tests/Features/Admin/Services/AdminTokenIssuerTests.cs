using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Models;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Admin.Services;

public sealed class AdminTokenIssuerTests
{
    private static readonly DateTimeOffset now = new(2031, 2, 28, 12, 0, 0, TimeSpan.Zero);

    private static readonly GoogleIdentity identity = new(
        "google-subject-1",
        AdminHarness.AllowedEmail,
        AdminHarness.AllowedName
    );

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheTokenIsAnEs256JwtThatValidatesWithThePublicKey()
    {
        FakeSessionSigningKey signingKey = new();

        AdminSession session = await CreateIssuer(signingKey).IssueAsync(identity, Cancellation);

        TokenValidationResult result = await new JsonWebTokenHandler().ValidateTokenAsync(session.Token, new TokenValidationParameters
        {
            ValidIssuer = SessionTokenIssuer.Issuer,
            ValidAudience = AdminTokenIssuer.Audience,
            IssuerSigningKey = signingKey.Key,
            ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
            ValidateLifetime = false,
        });
        Assert.True(result.IsValid, result.Exception?.Message);
    }

    [Fact]
    public async Task TheTokenCarriesTheAdminRoleTheEmailAndTheLifetime()
    {
        AdminSession session = await CreateIssuer(new FakeSessionSigningKey(), TimeSpan.FromMinutes(7)).IssueAsync(identity, Cancellation);

        JsonWebToken token = new(session.Token);
        Assert.Equal(SessionTokenIssuer.Issuer, token.Issuer);
        Assert.Equal([AdminTokenIssuer.Audience], token.Audiences);
        Assert.Equal("google-subject-1", token.Subject);
        Assert.Equal(AdminHarness.AllowedEmail, token.GetClaim("email").Value);
        Assert.Equal(AdminTokenIssuer.AdminRole, token.GetClaim(AdminTokenIssuer.RoleClaim).Value);
        Assert.Equal(now.AddMinutes(7).UtcDateTime, token.ValidTo);
        Assert.Equal(now.AddMinutes(7), session.ExpiresAt);
        Assert.Equal(AdminHarness.AllowedEmail, session.Email);
    }

    [Fact]
    public async Task TheNameIsInTheSessionAndInTheToken()
    {
        AdminSession session = await CreateIssuer(new FakeSessionSigningKey()).IssueAsync(identity, Cancellation);

        Assert.Equal(AdminHarness.AllowedName, session.Name);
        Assert.Equal(AdminHarness.AllowedName, new JsonWebToken(session.Token).GetClaim("name").Value);
    }

    [Fact]
    public async Task AGoogleAccountWithoutANameGetsNoNameClaim()
    {
        GoogleIdentity unnamed = new(
            "google-subject-1",
            AdminHarness.AllowedEmail,
            null
        );

        AdminSession session = await CreateIssuer(new FakeSessionSigningKey()).IssueAsync(unnamed, Cancellation);

        Assert.Null(session.Name);
        Assert.DoesNotContain(new JsonWebToken(session.Token).Claims, claim => claim.Type == "name");
    }

    [Fact]
    public async Task TheLifetimeDefaultsToFourHours()
    {
        AdminSession session = await CreateIssuer(new FakeSessionSigningKey()).IssueAsync(identity, Cancellation);

        Assert.Equal(now.AddHours(4), session.ExpiresAt);
    }

    private static AdminTokenIssuer CreateIssuer(FakeSessionSigningKey signingKey, TimeSpan? lifetime = null)
    {
        AdminSettings settings = new();
        if (lifetime is TimeSpan configured)
        {
            settings.Lifetime = configured;
        }

        return new AdminTokenIssuer(signingKey, new FakeTimeProvider(now), Options.Create(settings));
    }
}
