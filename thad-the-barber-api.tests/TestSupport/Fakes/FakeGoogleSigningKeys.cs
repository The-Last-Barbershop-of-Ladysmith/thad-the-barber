using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Admin.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Google's signing keys for tests: one RSA key in memory, so tests make ID tokens Google never signed.</summary>
public sealed class FakeGoogleSigningKeys : IGoogleSigningKeys
{
    public RsaSecurityKey Key { get; } = new(RSA.Create(2048));

    /// <summary>When set, loading the keys fails with it, as when Google can't be reached.</summary>
    public Exception? Failure { get; init; }

    public Task<IReadOnlyCollection<SecurityKey>> GetAsync(CancellationToken cancellationToken) =>
        Failure is null
            ? Task.FromResult<IReadOnlyCollection<SecurityKey>>([Key])
            : Task.FromException<IReadOnlyCollection<SecurityKey>>(Failure);
}
