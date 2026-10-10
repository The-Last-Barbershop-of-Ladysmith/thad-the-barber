using System.Security.Cryptography;
using System.Text;
using Azure;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Configuration;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Session.Services;

public sealed class KeyVaultSessionSigningKeyTests
{
    private const string KeyName = "session-key";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASignatureVerifiesWithThePublicKey()
    {
        KeyVaultSessionSigningKey signingKey = CreateKey(new FakeKeyClient(KeyName));
        byte[] data = Encoding.ASCII.GetBytes("header.payload");

        byte[] signature = await signingKey.SignAsync(data, Cancellation);

        ECDsaSecurityKey publicKey = Assert.IsType<ECDsaSecurityKey>(signingKey.PublicKey);
        Assert.Equal(64, signature.Length);
        Assert.True(publicKey.ECDsa.VerifyData(data, signature, HashAlgorithmName.SHA256));
    }

    [Fact]
    public async Task TheKeyIsReadOnceAndSignsWithTheVersionItRead()
    {
        FakeKeyClient vault = new(KeyName);
        KeyVaultSessionSigningKey signingKey = CreateKey(vault);

        _ = signingKey.PublicKey;
        await signingKey.SignAsync([1], Cancellation);
        await signingKey.SignAsync([2], Cancellation);
        _ = signingKey.PublicKey;

        Assert.Equal(1, vault.Reads);
        Assert.Equal([$"{KeyName}/{FakeKeyClient.Version}"], vault.CryptographyClientsFor);
    }

    [Fact]
    public void AFailedReadIsRetriedOnTheNextUse()
    {
        FakeKeyClient vault = new(KeyName)
        {
            FailWith = 403,
        };
        KeyVaultSessionSigningKey signingKey = CreateKey(vault);

        Assert.Throws<RequestFailedException>(() => signingKey.PublicKey);
        vault.FailWith = null;

        Assert.IsType<ECDsaSecurityKey>(signingKey.PublicKey);
        Assert.Equal(2, vault.Reads);
    }

    private static KeyVaultSessionSigningKey CreateKey(FakeKeyClient vault) =>
        new(vault, Options.Create(new SessionSettings
        {
            SigningKeyName = KeyName,
        }));
}
