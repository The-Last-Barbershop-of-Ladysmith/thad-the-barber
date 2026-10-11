using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

public sealed class ManageTokenSignerTests
{
    private const string BookingId = "bk_test-0001ab";

    private static readonly ManageTokenSigner signer = ManageTokens.Signer;

    [Fact]
    public void TheTokenIsTheBase64UrlHmacSha256OfTheBookingId()
    {
        byte[] expected = HMACSHA256.HashData(Convert.FromBase64String(ApiFactory.ManageLinkHmacKey), Encoding.UTF8.GetBytes(BookingId));

        string token = signer.Sign(BookingId);

        Assert.Equal(expected, Base64Url.DecodeFromChars(token));
        Assert.DoesNotContain(token, character => character is '+' or '/' or '=');
    }

    [Fact]
    public void ATokenIsValidForItsOwnBooking()
    {
        Assert.True(signer.IsValid(BookingId, signer.Sign(BookingId)));
    }

    [Fact]
    public void ATokenIsInvalidForAnotherBooking()
    {
        Assert.False(signer.IsValid("bk_test-0002ab", signer.Sign(BookingId)));
    }

    [Fact]
    public void ATokenSignedWithAnotherKeyIsInvalid()
    {
        ManageTokenSigner otherSigner = ManageTokens.CreateSigner(Convert.ToBase64String(new byte[32]));

        Assert.False(signer.IsValid(BookingId, otherSigner.Sign(BookingId)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-token")]
    [InlineData("é")]
    public void AMissingOrMalformedTokenIsInvalid(string? token)
    {
        Assert.False(signer.IsValid(BookingId, token));
    }

    [Fact]
    public void ATokenWithOneCharacterChangedIsInvalid()
    {
        string token = signer.Sign(BookingId);
        string tampered = (token[0] == 'A' ? "B" : "A") + token[1..];

        Assert.False(signer.IsValid(BookingId, tampered));
    }

    [Fact]
    public void ATruncatedTokenIsInvalid()
    {
        Assert.False(signer.IsValid(BookingId, signer.Sign(BookingId)[..^1]));
    }
}
