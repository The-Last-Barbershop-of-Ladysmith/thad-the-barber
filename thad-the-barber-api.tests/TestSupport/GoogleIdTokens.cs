using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Google ID tokens made in tests, valid by default; change one part to make the token the API should refuse.</summary>
public static class GoogleIdTokens
{
    public const string GoogleIssuer = "https://accounts.google.com";

    public static string Create(
        SecurityKey key,
        string email = AdminHarness.AllowedEmail,
        string audience = AdminHarness.GoogleClientId,
        string issuer = GoogleIssuer,
        DateTime? expires = null,
        object? emailVerified = null,
        bool includeEmail = true,
        string? name = null)
    {
        DateTime expiresAt = expires ?? DateTime.UtcNow.AddMinutes(30);
        Dictionary<string, object> claims = new()
        {
            [JwtRegisteredClaimNames.Sub] = "google-subject-1",
            ["email_verified"] = emailVerified ?? true,
        };
        if (includeEmail)
        {
            claims["email"] = email;
        }

        if (name is not null)
        {
            claims["name"] = name;
        }

        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Claims = claims,
            Issuer = issuer,
            Audience = audience,
            IssuedAt = expiresAt.AddMinutes(-30),
            NotBefore = expiresAt.AddMinutes(-30),
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256),
        });
    }
}
