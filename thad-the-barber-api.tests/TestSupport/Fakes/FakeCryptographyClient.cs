using System.Security.Cryptography;
using Azure.Security.KeyVault.Keys;
using Azure.Security.KeyVault.Keys.Cryptography;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Key Vault's sign operation for tests, done in memory with the key <see cref="FakeKeyClient"/> holds.</summary>
public sealed class FakeCryptographyClient(ECDsa ecdsa) : CryptographyClient
{
    public override Task<SignResult> SignDataAsync(SignatureAlgorithm algorithm, byte[] data, CancellationToken cancellationToken = default) =>
        Task.FromResult(CryptographyModelFactory.SignResult(
            keyId: null,
            signature: ecdsa.SignData(data, HashAlgorithmName.SHA256),
            algorithm: algorithm
        ));
}
