using Azure.Extensions.AspNetCore.Configuration.Secrets;
using Azure.Security.KeyVault.Secrets;

namespace ThadTheBarber.Api.Infrastructure.KeyVault.Configuration;

/// <summary>Loads every Key Vault secret into configuration except <paramref name="skipped"/>.</summary>
public sealed class SkipSecretsManager(IReadOnlySet<string> skipped) : KeyVaultSecretManager
{
    public override bool Load(SecretProperties secret) => !skipped.Contains(secret.Name);
}
