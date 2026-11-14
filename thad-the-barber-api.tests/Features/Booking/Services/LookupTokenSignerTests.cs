using System.Buffers.Text;
using System.Globalization;
using System.Text;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

public sealed class LookupTokenSignerTests
{
    private const string Phone = "+15555550123";
    private static readonly DateTimeOffset now = DateTimeOffset.Parse("2026-11-14T15:00:00Z", CultureInfo.InvariantCulture);
    private static readonly TimeSpan lifetime = TimeSpan.FromMinutes(15);

    [Fact]
    public void ATokenGivesBackItsPhoneBeforeItExpires()
    {
        FakeTimeProvider clock = new(now);
        LookupTokenSigner signer = LookupTokens.CreateSigner(clock);
        string token = signer.Sign(Phone, now + lifetime);

        clock.Advance(lifetime - TimeSpan.FromSeconds(1));

        Assert.Equal(Phone, signer.ReadPhone(token));
    }

    [Fact]
    public void ATokenIsRefusedFromItsExpiryOn()
    {
        FakeTimeProvider clock = new(now);
        LookupTokenSigner signer = LookupTokens.CreateSigner(clock);
        string token = signer.Sign(Phone, now + lifetime);

        clock.Advance(lifetime);

        Assert.Null(signer.ReadPhone(token));
    }

    [Fact]
    public void ATokenHasTwoBase64UrlPartsAndNoPlainPhone()
    {
        string token = LookupTokens.CreateSigner(new FakeTimeProvider(now)).Sign(Phone, now + lifetime);

        string[] parts = token.Split('.');

        Assert.Equal(2, parts.Length);
        Assert.All(parts, part => Assert.True(Base64Url.IsValid(part)));
        Assert.DoesNotContain("5555550123", token, StringComparison.Ordinal);
    }

    [Fact]
    public void ATokenForAnotherPhoneGivesThatPhone()
    {
        LookupTokenSigner signer = LookupTokens.CreateSigner(new FakeTimeProvider(now));

        Assert.Equal("+15555550199", signer.ReadPhone(signer.Sign("+15555550199", now + lifetime)));
    }

    [Fact]
    public void ATokenWithAnotherPhoneSwappedInIsRefused()
    {
        LookupTokenSigner signer = LookupTokens.CreateSigner(new FakeTimeProvider(now));
        string[] genuine = signer.Sign(Phone, now + lifetime).Split('.');
        string otherPayload = Base64Url.EncodeToString(Encoding.UTF8.GetBytes($"+15555550199|{(now + lifetime).ToUnixTimeSeconds()}"));

        Assert.Null(signer.ReadPhone($"{otherPayload}.{genuine[1]}"));
    }

    [Fact]
    public void ATokenWithALaterExpirySwappedInIsRefused()
    {
        LookupTokenSigner signer = LookupTokens.CreateSigner(new FakeTimeProvider(now));
        string[] genuine = signer.Sign(Phone, now + lifetime).Split('.');
        string laterPayload = Base64Url.EncodeToString(Encoding.UTF8.GetBytes($"{Phone}|{(now + TimeSpan.FromDays(1)).ToUnixTimeSeconds()}"));

        Assert.Null(signer.ReadPhone($"{laterPayload}.{genuine[1]}"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(".")]
    [InlineData("abc")]
    [InlineData("abc.def.ghi")]
    [InlineData("not base64!.not base64!")]
    public void AMissingOrMalformedTokenIsRefused(string? token)
    {
        Assert.Null(LookupTokens.CreateSigner(new FakeTimeProvider(now)).ReadPhone(token));
    }

    [Fact]
    public void ATruncatedTokenIsRefused()
    {
        LookupTokenSigner signer = LookupTokens.CreateSigner(new FakeTimeProvider(now));
        string token = signer.Sign(Phone, now + lifetime);

        Assert.Null(signer.ReadPhone(token[..^4]));
    }

    [Fact]
    public void ATokenSignedWithAnotherKeyIsRefused()
    {
        FakeTimeProvider clock = new(now);
        string foreign = LookupTokens.CreateSigner(clock, Convert.ToBase64String(new byte[32])).Sign(Phone, now + lifetime);

        Assert.Null(LookupTokens.CreateSigner(clock).ReadPhone(foreign));
    }

    [Fact]
    public void AManageTokenIsNotALookupToken()
    {
        string manageToken = ManageTokens.Signer.Sign("bk_test-0001fk");

        Assert.Null(LookupTokens.CreateSigner(new FakeTimeProvider(now)).ReadPhone(manageToken));
    }

    [Fact]
    public void ALookupTokenIsNotAManageTokenForAnyBooking()
    {
        string lookupToken = LookupTokens.CreateSigner(new FakeTimeProvider(now)).Sign(Phone, now + lifetime);

        Assert.False(ManageTokens.Signer.IsValid(Phone, lookupToken));
        Assert.False(ManageTokens.Signer.IsValid($"{Phone}|{(now + lifetime).ToUnixTimeSeconds()}", lookupToken));
    }
}
