using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Models;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Session.Services;

public sealed class SessionTokenIssuerTests
{
    private static readonly DateTimeOffset now = new(2031, 2, 28, 23, 59, 58, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheTokenIsAnEs256JwtThatValidatesWithThePublicKey()
    {
        FakeSessionSigningKey signingKey = new();

        SessionToken session = await CreateIssuer(signingKey).IssueAsync(Cancellation);

        TokenValidationResult result = await ValidateAsync(session.Token, signingKey.Key);
        Assert.True(result.IsValid, result.Exception?.Message);
        JsonWebToken token = Assert.IsType<JsonWebToken>(result.SecurityToken);
        Assert.Equal(SecurityAlgorithms.EcdsaSha256, token.Alg);
        Assert.Equal("JWT", token.Typ);
    }

    [Fact]
    public async Task TheTokenNamesTheApiAndLastsTheConfiguredLifetime()
    {
        SessionToken session = await CreateIssuer(new FakeSessionSigningKey(), TimeSpan.FromMinutes(7)).IssueAsync(Cancellation);

        JsonWebToken token = new(session.Token);
        Assert.Equal(SessionTokenIssuer.Issuer, token.Issuer);
        Assert.Equal([SessionTokenIssuer.Audience], token.Audiences);
        Assert.Equal(now.UtcDateTime, token.IssuedAt);
        Assert.Equal(now.AddMinutes(7).UtcDateTime, token.ValidTo);
        Assert.Equal(now.AddMinutes(7), session.ExpiresAt);
    }

    [Fact]
    public async Task EveryTokenHasItsOwnRandomSessionId()
    {
        SessionTokenIssuer issuer = CreateIssuer(new FakeSessionSigningKey());

        string first = new JsonWebToken((await issuer.IssueAsync(Cancellation)).Token).Subject;
        string second = new JsonWebToken((await issuer.IssueAsync(Cancellation)).Token).Subject;

        Assert.Matches("^[0-9a-f]{32}$", first);
        Assert.NotEqual(first, second);
    }

    private static SessionTokenIssuer CreateIssuer(FakeSessionSigningKey signingKey, TimeSpan? lifetime = null)
    {
        SessionSettings settings = new()
        {
            SigningKeyName = "unused",
        };
        if (lifetime is TimeSpan configured)
        {
            settings.Lifetime = configured;
        }

        return new SessionTokenIssuer(signingKey, new FakeTimeProvider(now), Options.Create(settings));
    }

    private static Task<TokenValidationResult> ValidateAsync(string token, SecurityKey key) =>
        new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidIssuer = SessionTokenIssuer.Issuer,
            ValidAudience = SessionTokenIssuer.Audience,
            IssuerSigningKey = key,
            ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
            ValidateLifetime = false,
        });
}
