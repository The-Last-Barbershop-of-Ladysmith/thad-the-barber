using Microsoft.Extensions.Configuration;
using Azure.Security.KeyVault.Secrets;
using ThadTheBarber.Api.Infrastructure.KeyVault.Configuration;
using ThadTheBarber.Api.Square.Configuration;

namespace ThadTheBarber.Api.Tests;

public sealed class KeyVaultSetupTests
{
    [Fact]
    public void VaultNameBecomesItsUri()
    {
        Uri? uri = KeyVaultSetup.GetVaultUri(Configuration("kv-ttb-dev-centralus"));

        Assert.Equal(new Uri("https://kv-ttb-dev-centralus.vault.azure.net/"), uri);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void NoVaultNameSkipsKeyVault(string? name)
    {
        Assert.Null(KeyVaultSetup.GetVaultUri(Configuration(name)));
    }

    [Theory]
    [InlineData("Development", "kv-ttb-dev-centralus")]
    [InlineData("Test", "kv-ttb-test-centralus")]
    public void EachAzureEnvironmentNamesItsVault(string environment, string expected)
    {
        Assert.Equal(expected, AppSettings(environment)["KeyVault:Name"]);
    }

    [Fact]
    public void TestsHaveNoVault()
    {
        Assert.Null(KeyVaultSetup.GetVaultUri(AppSettings("Testing")));
    }

    [Theory]
    [InlineData(SquareSecrets.RefreshToken, false)]
    [InlineData(SquareSecrets.ApplicationSecret, false)]
    [InlineData(SquareSecrets.SandboxSeedToken, false)]
    [InlineData("Cors--AllowedOrigins--0", true)]
    public void SquareSecretsStayOutOfConfiguration(string secretName, bool loaded)
    {
        SkipSecretsManager manager = new(SquareSecrets.All);

        Assert.Equal(loaded, manager.Load(new SecretProperties(secretName)));
    }

    private static IConfiguration Configuration(string? name) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["KeyVault:Name"] = name })
            .Build();

    /// <summary>
    /// Loads the API's appsettings the way the host would for <paramref name="environment"/>. The project reference
    /// copies them into the test output folder, so these are the files that ship with the build.
    /// </summary>
    private static IConfiguration AppSettings(string environment) =>
        new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json")
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .Build();
}
