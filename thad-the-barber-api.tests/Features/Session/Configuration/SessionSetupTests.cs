using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Session.Configuration;

namespace ThadTheBarber.Api.Tests.Features.Session.Configuration;

public sealed class SessionSetupTests
{
    [Fact]
    public void StartupFailsWithoutASigningKeyName()
    {
        using ServiceProvider services = new ServiceCollection()
            .AddSessionTokens(new ConfigurationBuilder().Build())
            .BuildServiceProvider();

        Assert.Throws<OptionsValidationException>(() => services.GetRequiredService<IStartupValidator>().Validate());
    }
}
