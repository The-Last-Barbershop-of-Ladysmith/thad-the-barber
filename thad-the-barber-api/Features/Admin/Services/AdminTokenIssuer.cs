using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Models;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Features.Admin.Services;

/// <summary>
/// Builds the admin JWT the same way <see cref="SessionTokenIssuer"/> builds the visitor's, signed by the same Key Vault
/// key. It differs in its audience and in the <c>role</c> claim the <c>Admin</c> policy requires; the API's bearer
/// check accepts both audiences, and only this one carries the role.
/// </summary>
public sealed class AdminTokenIssuer(ISessionSigningKey signingKey, TimeProvider time, IOptions<AdminSettings> settings)
{
    public const string Audience = "ttb-admin";
    public const string RoleClaim = "role";
    public const string AdminRole = "admin";

    private static readonly string EncodedHeader = Base64Url.EncodeToString("""{"alg":"ES256","typ":"JWT"}"""u8);

    public async Task<AdminSession> IssueAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        long issuedAt = time.GetUtcNow().ToUnixTimeSeconds();
        long expiresAt = issuedAt + (long)settings.Value.Lifetime.TotalSeconds;
        Dictionary<string, object> claims = new()
        {
            ["sub"] = identity.Subject,
            ["email"] = identity.Email,
            [RoleClaim] = AdminRole,
            ["iss"] = SessionTokenIssuer.Issuer,
            ["aud"] = Audience,
            ["iat"] = issuedAt,
            ["exp"] = expiresAt,
        };
        if (identity.Name is not null)
        {
            claims["name"] = identity.Name;
        }

        string signingInput = $"{EncodedHeader}.{Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(claims))}";
        byte[] signature = await signingKey.SignAsync(Encoding.ASCII.GetBytes(signingInput), cancellationToken);
        return new AdminSession(
            $"{signingInput}.{Base64Url.EncodeToString(signature)}",
            DateTimeOffset.FromUnixTimeSeconds(expiresAt),
            identity.Email,
            identity.Name
        );
    }
}
