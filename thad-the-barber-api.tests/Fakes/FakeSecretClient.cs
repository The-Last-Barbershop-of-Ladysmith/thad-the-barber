using Azure;
using Azure.Security.KeyVault.Secrets;

namespace ThadTheBarber.Api.Tests.Fakes;

/// <summary>Key Vault for tests: holds secrets in memory and counts reads. A missing name throws a 404 like the vault.</summary>
public sealed class FakeSecretClient(Dictionary<string, string> secrets) : SecretClient
{
    public int Reads { get; private set; }

    public override Task<Response<KeyVaultSecret>> GetSecretAsync(string name, string? version = null, SecretContentType? outContentType = null, CancellationToken cancellationToken = default)
    {
        Reads++;
        if (!secrets.TryGetValue(name, out string? value))
        {
            throw new RequestFailedException(404, $"Secret {name} not found.");
        }

        return Task.FromResult(Response.FromValue(new KeyVaultSecret(name, value), new FakeResponse()));
    }
}
