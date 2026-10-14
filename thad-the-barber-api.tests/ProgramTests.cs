using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests;

public sealed class ProgramTests
{
    /// <summary>TestServer ignores Kestrel's limits, so this checks the setting rather than sending a large body.</summary>
    [Fact]
    public void RequestBodiesAreCappedAt128Kilobytes()
    {
        using ApiFactory api = new();

        KestrelServerOptions kestrel = api.Services.GetRequiredService<IOptions<KestrelServerOptions>>().Value;

        Assert.Equal(128 * 1024, kestrel.Limits.MaxRequestBodySize);
    }
}
