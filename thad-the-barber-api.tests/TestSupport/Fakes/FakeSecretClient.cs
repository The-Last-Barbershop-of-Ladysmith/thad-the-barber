using Azure;
using Azure.Security.KeyVault.Secrets;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Key Vault for tests: holds secrets in memory and counts reads. A missing name throws a 404 like the vault.</summary>
public sealed class FakeSecretClient(Dictionary<string, string> secrets) : SecretClient
{
    public int Reads { get; private set; }

    /// <summary>When set, every read fails with this status, like a vault behind its firewall (403).</summary>
    public int? FailWith { get; set; }

    public override Task<Response<KeyVaultSecret>> GetSecretAsync(string name, string? version = null, SecretContentType? outContentType = null, CancellationToken cancellationToken = default)
    {
        Reads++;
        if (FailWith is int status)
        {
            throw new RequestFailedException(status, $"Key Vault answered {status}.");
        }

        if (!secrets.TryGetValue(name, out string? value))
        {
            throw new RequestFailedException(404, $"Secret {name} not found.");
        }

        return Task.FromResult(Response.FromValue(new KeyVaultSecret(name, value), new FakeResponse()));
    }
}
