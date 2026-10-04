using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

namespace ThadTheBarber.Api.Infrastructure.KeyVault.Configuration;

/// <summary>
/// Loads Key Vault secrets into configuration ("--" in secret names maps to ":", so <c>Cors--AllowedOrigins--0</c>
/// becomes <c>Cors:AllowedOrigins:0</c>) and registers a <see cref="SecretClient"/> for secrets read on demand. The
/// vault is named by <c>KeyVault:Name</c> in <c>appsettings.{Environment}.json</c>, picked by
/// <c>ASPNETCORE_ENVIRONMENT</c>. Development (local runs and the Azure dev app) uses the dev vault; empty (tests)
/// skips Key Vault.
/// </summary>
public static class KeyVaultSetup
{
    /// <param name="onDemandSecrets">Secrets kept out of configuration; read them through <see cref="SecretClient"/>.</param>
    public static WebApplicationBuilder AddKeyVaultIfConfigured(this WebApplicationBuilder builder, IReadOnlySet<string> onDemandSecrets)
    {
        if (GetVaultUri(builder.Configuration) is Uri vaultUri)
        {
            DefaultAzureCredential credential = new();
            builder.Configuration.AddAzureKeyVault(vaultUri, credential, new SkipSecretsManager(onDemandSecrets));
            builder.Services.AddSingleton(new SecretClient(vaultUri, credential));
        }

        return builder;
    }

    /// <summary>The vault's URI from its name, e.g. <c>kv-ttb-dev-centralus</c> → <c>https://kv-ttb-dev-centralus.vault.azure.net/</c>.</summary>
    public static Uri? GetVaultUri(IConfiguration configuration) =>
        configuration["KeyVault:Name"] is { Length: > 0 } name
            ? new Uri($"https://{name.Trim()}.vault.azure.net/")
            : null;
}
