using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Exceptions;
using ThadTheBarber.Api.Features.Admin.Models;

namespace ThadTheBarber.Api.Features.Admin.Services;

/// <summary>
/// Checks a Google ID token the way Google documents: its signature against Google's keys, the issuer, that it was made
/// for our OAuth client (<c>aud</c>), that it hasn't expired, and that Google has verified the email.
/// </summary>
public sealed class GoogleIdTokenValidator(IGoogleSigningKeys signingKeys, TimeProvider time, IOptions<AdminSettings> settings)
{
    private static readonly string[] Issuers = ["https://accounts.google.com", "accounts.google.com"];

    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken cancellationToken)
    {
        IReadOnlyCollection<SecurityKey> keys;
        try
        {
            keys = await signingKeys.GetAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new InvalidIdTokenException("Google's signing keys couldn't be loaded.", exception);
        }

        TokenValidationResult result = await new JsonWebTokenHandler().ValidateTokenAsync(
            idToken,
            new TokenValidationParameters
            {
                ValidIssuers = Issuers,
                ValidAudience = settings.Value.GoogleClientId,
                ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                IssuerSigningKeys = keys,
                ClockSkew = TimeSpan.FromMinutes(1),
                // The token library reads the system clock; this keeps the injected one in charge, so tests can set the time.
                LifetimeValidator = (notBefore, expires, _, parameters) =>
                {
                    DateTime now = time.GetUtcNow().UtcDateTime;
                    return expires is not null
                        && now <= expires.Value + parameters.ClockSkew
                        && (notBefore is null || now >= notBefore.Value - parameters.ClockSkew);
                },
            }
        );
        if (!result.IsValid)
        {
            throw new InvalidIdTokenException("The Google ID token failed validation.", result.Exception);
        }

        JsonWebToken token = (JsonWebToken)result.SecurityToken;
        string? email = token.TryGetPayloadValue("email", out string? address) ? address : null;
        bool isEmailVerified = token.TryGetPayloadValue("email_verified", out object? verified)
            && verified is true or "true";
        if (string.IsNullOrWhiteSpace(email) || !isEmailVerified)
        {
            throw new InvalidIdTokenException("The Google ID token has no verified email.");
        }

        return new GoogleIdentity(token.Subject, email);
    }
}
