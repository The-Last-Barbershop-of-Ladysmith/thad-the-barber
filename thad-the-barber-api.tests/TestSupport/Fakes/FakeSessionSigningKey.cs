using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>The session signing key for tests: a fresh P-256 key in memory instead of Key Vault.</summary>
public sealed class FakeSessionSigningKey : ISessionSigningKey
{
    public ECDsaSecurityKey Key { get; } = new(ECDsa.Create(ECCurve.NamedCurves.nistP256));

    public SecurityKey PublicKey => Key;

    public Task<byte[]> SignAsync(byte[] data, CancellationToken cancellationToken) =>
        Task.FromResult(Key.ECDsa.SignData(data, HashAlgorithmName.SHA256));
}
