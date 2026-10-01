using Microsoft.Extensions.Configuration;
using ThadTheBarber.Api.Infrastructure;

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
    [InlineData("Dev", "kv-ttb-dev-centralus")]
    [InlineData("Test", "kv-ttb-test-centralus")]
    public void EachAzureEnvironmentNamesItsVault(string environment, string expected)
    {
        Assert.Equal(expected, AppSettings(environment)["KeyVault:Name"]);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public void LocalRunsAndTestsHaveNoVault(string environment)
    {
        Assert.Null(KeyVaultSetup.GetVaultUri(AppSettings(environment)));
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
