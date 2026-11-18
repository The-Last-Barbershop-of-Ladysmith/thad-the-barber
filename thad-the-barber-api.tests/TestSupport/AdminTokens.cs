using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Admin-audience JWTs made in tests, valid by default; change one part to make the token the API should refuse.</summary>
public static class AdminTokens
{
    public static string Create(
        SecurityKey key,
        string? role = AdminTokenIssuer.AdminRole,
        string audience = AdminTokenIssuer.Audience,
        DateTime? expires = null,
        string? name = null)
    {
        DateTime expiresAt = expires ?? DateTime.UtcNow.AddMinutes(30);
        List<Claim> claims = [new Claim(JwtRegisteredClaimNames.Sub, "google-subject-1"), new Claim("email", AdminHarness.AllowedEmail)];
        if (role is not null)
        {
            claims.Add(new Claim(AdminTokenIssuer.RoleClaim, role));
        }

        if (name is not null)
        {
            claims.Add(new Claim("name", name));
        }

        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = SessionTokenIssuer.Issuer,
            Audience = audience,
            IssuedAt = expiresAt.AddMinutes(-30),
            NotBefore = expiresAt.AddMinutes(-30),
            Expires = expiresAt,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.EcdsaSha256),
        });
    }
}
