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
        IConfiguration configuration = new ConfigurationBuilder()
            .SetBasePath(ApiContentRoot())
            .AddJsonFile("appsettings.json")
            .AddJsonFile($"appsettings.{environment}.json")
            .Build();

        Assert.Equal(expected, configuration["KeyVault:Name"]);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public void LocalRunsAndTestsHaveNoVault(string environment)
    {
        IConfiguration configuration = new ConfigurationBuilder()
            .SetBasePath(ApiContentRoot())
            .AddJsonFile("appsettings.json")
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .Build();

        Assert.Null(KeyVaultSetup.GetVaultUri(configuration));
    }

    private static IConfiguration Configuration(string? name) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["KeyVault:Name"] = name })
            .Build();

    private static string ApiContentRoot() =>
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "thad-the-barber-api"));
}
