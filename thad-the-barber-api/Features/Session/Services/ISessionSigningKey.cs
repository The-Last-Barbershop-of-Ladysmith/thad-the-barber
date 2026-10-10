using Microsoft.IdentityModel.Tokens;

namespace ThadTheBarber.Api.Features.Session.Services;

/// <summary>Signs session tokens (ES256) and gives the public key that validates them.</summary>
public interface ISessionSigningKey
{
    SecurityKey PublicKey { get; }

    /// <summary>The ES256 signature of <paramref name="data"/>: R and S, 32 bytes each, the form a JWT carries.</summary>
    Task<byte[]> SignAsync(byte[] data, CancellationToken cancellationToken);
}
