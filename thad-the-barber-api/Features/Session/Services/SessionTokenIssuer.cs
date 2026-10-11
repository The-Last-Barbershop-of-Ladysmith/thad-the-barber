using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Models;

namespace ThadTheBarber.Api.Features.Session.Services;

/// <summary>
/// Builds the anonymous session JWT by hand, because the signature comes from Key Vault: the token libraries sign
/// synchronously with a key they hold, and this key never leaves the vault.
/// </summary>
/// <remarks>tools/session-token builds the same token for Swagger in dev; change it there too.</remarks>
public sealed class SessionTokenIssuer(ISessionSigningKey signingKey, TimeProvider time, IOptions<SessionSettings> settings)
{
    public const string Issuer = "ttb-api";
    public const string Audience = "ttb-api";

    private static readonly string encodedHeader = Base64Url.EncodeToString("""{"alg":"ES256","typ":"JWT"}"""u8);

    public async Task<SessionToken> IssueAsync(CancellationToken cancellationToken)
    {
        long issuedAt = time.GetUtcNow().ToUnixTimeSeconds();
        long expiresAt = issuedAt + (long)settings.Value.Lifetime.TotalSeconds;
        Dictionary<string, object> claims = new()
        {
            ["sub"] = Guid.NewGuid().ToString("N"),
            ["iss"] = Issuer,
            ["aud"] = Audience,
            ["iat"] = issuedAt,
            ["exp"] = expiresAt,
        };

        string signingInput = $"{encodedHeader}.{Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(claims))}";
        byte[] signature = await signingKey.SignAsync(Encoding.ASCII.GetBytes(signingInput), cancellationToken);
        return new SessionToken(
            $"{signingInput}.{Base64Url.EncodeToString(signature)}",
            DateTimeOffset.FromUnixTimeSeconds(expiresAt)
        );
    }
}
