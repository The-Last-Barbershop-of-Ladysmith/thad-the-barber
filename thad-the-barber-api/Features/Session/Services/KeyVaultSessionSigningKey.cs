using Azure.Security.KeyVault.Keys;
using Azure.Security.KeyVault.Keys.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Configuration;

namespace ThadTheBarber.Api.Features.Session.Services;

/// <summary>
/// The signing key in Key Vault; its private half never leaves the vault, which signs each token. The first use reads
/// the key's current version, and signing and validating both stick to that version until the app restarts, so
/// rotating the key in the vault can't leave tokens signed by one version and checked against another. A failed read
/// is retried on the next use, not remembered.
/// </summary>
public sealed class KeyVaultSessionSigningKey : ISessionSigningKey
{
    private readonly Lazy<KeyVaultKey> _key;
    private readonly Lazy<SecurityKey> _publicKey;
    private readonly Lazy<CryptographyClient> _signer;

    public KeyVaultSessionSigningKey(KeyClient keys, IOptions<SessionSettings> settings)
    {
        _key = new(() => keys.GetKey(settings.Value.SigningKeyName).Value, LazyThreadSafetyMode.PublicationOnly);
        _publicKey = new(() => new ECDsaSecurityKey(_key.Value.Key.ToECDsa()), LazyThreadSafetyMode.PublicationOnly);
        _signer = new(() => keys.GetCryptographyClient(_key.Value.Name, _key.Value.Properties.Version), LazyThreadSafetyMode.PublicationOnly);
    }

    public SecurityKey PublicKey => _publicKey.Value;

    public async Task<byte[]> SignAsync(byte[] data, CancellationToken cancellationToken)
    {
        SignResult result = await _signer.Value.SignDataAsync(SignatureAlgorithm.ES256, data, cancellationToken);
        return result.Signature;
    }
}
