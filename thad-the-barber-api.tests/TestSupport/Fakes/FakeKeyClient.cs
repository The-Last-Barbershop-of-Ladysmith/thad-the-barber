using System.Security.Cryptography;
using Azure;
using Azure.Security.KeyVault.Keys;
using Azure.Security.KeyVault.Keys.Cryptography;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// Key Vault keys for tests: one P-256 key named <c>storedKeyName</c>, at <see cref="Version"/>, whose crypto client is
/// the SDK's local one, signing in memory. Counts reads; <see cref="FailWith"/> makes them throw like a vault behind its firewall.
/// </summary>
public sealed class FakeKeyClient(string storedKeyName) : KeyClient
{
    private readonly ECDsa _ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);

    public const string Version = "version-1";

    public int Reads { get; private set; }

    public int? FailWith { get; set; }

    public List<string> CryptographyClientsFor { get; } = [];

    public override Response<KeyVaultKey> GetKey(string name, string? version = null, CancellationToken cancellationToken = default)
    {
        Reads++;
        if (FailWith is int status)
        {
            throw new RequestFailedException(status, $"Key Vault answered {status}.");
        }

        if (name != storedKeyName)
        {
            throw new RequestFailedException(404, $"Key {name} not found.");
        }

        KeyProperties properties = KeyModelFactory.KeyProperties(
            id: new Uri($"https://vault.example/keys/{storedKeyName}/{Version}"),
            vaultUri: new Uri("https://vault.example/"),
            name: storedKeyName,
            version: Version
        );
        return Response.FromValue(KeyModelFactory.KeyVaultKey(properties, new JsonWebKey(_ecdsa)), new FakeResponse());
    }

    public override CryptographyClient GetCryptographyClient(string keyName, string? keyVersion = null)
    {
        CryptographyClientsFor.Add($"{keyName}/{keyVersion}");
        return new CryptographyClient(new JsonWebKey(_ecdsa, includePrivateParameters: true));
    }
}
