using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Session JWTs made in tests, valid by default; change one part to make the token the API should refuse.</summary>
public static class SessionTokens
{
    public static string Create(
        SecurityKey key,
        string issuer = SessionTokenIssuer.Issuer,
        string audience = SessionTokenIssuer.Audience,
        DateTime? expires = null,
        string algorithm = SecurityAlgorithms.EcdsaSha256)
    {
        DateTime expiresAt = expires ?? DateTime.UtcNow.AddMinutes(15);
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, "session-1")]),
            Issuer = issuer,
            Audience = audience,
            IssuedAt = expiresAt.AddMinutes(-15),
            NotBefore = expiresAt.AddMinutes(-15),
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, algorithm),
        });
    }
}
