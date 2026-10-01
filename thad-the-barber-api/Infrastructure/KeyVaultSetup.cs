using Azure.Identity;

namespace ThadTheBarber.Api.Infrastructure;

/// <summary>
/// Loads every Key Vault secret into configuration ("--" in secret names maps to ":", so <c>Cors--AllowedOrigins--0</c>
/// becomes <c>Cors:AllowedOrigins:0</c>). The vault is named by <c>KeyVault:Name</c>, set per environment in
/// <c>appsettings.{Environment}.json</c> or by the <c>KeyVault__Name</c> app setting, which wins.
/// Empty (local runs, tests) skips Key Vault; use user-secrets locally instead.
/// </summary>
public static class KeyVaultSetup
{
    public static IConfigurationManager AddKeyVaultIfConfigured(this IConfigurationManager configuration)
    {
        if (GetVaultUri(configuration) is Uri vaultUri)
        {
            configuration.AddAzureKeyVault(vaultUri, new DefaultAzureCredential());
        }

        return configuration;
    }

    /// <summary>The vault's URI from its name, e.g. <c>kv-ttb-dev-centralus</c> → <c>https://kv-ttb-dev-centralus.vault.azure.net/</c>.</summary>
    public static Uri? GetVaultUri(IConfiguration configuration) =>
        configuration["KeyVault:Name"] is { Length: > 0 } name
            ? new Uri($"https://{name.Trim()}.vault.azure.net/")
            : null;
}
