using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.Booking.Configuration;

public sealed class ManageLinkSettingsValidatorTests
{
    private static readonly ManageLinkSettingsValidator validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("not base64!")]
    [InlineData("MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMQ==")]
    public void AMissingMalformedOrShortKeyFailsStartup(string hmacKey)
    {
        Assert.True(validator.Validate(null, Settings(hmacKey)).Failed);
    }

    [Fact]
    public void A32ByteKeyIsAccepted()
    {
        Assert.True(validator.Validate(null, Settings(ApiFactory.ManageLinkHmacKey)).Succeeded);
    }

    [Fact]
    public void A64ByteKeyIsAccepted()
    {
        Assert.True(validator.Validate(null, Settings(Convert.ToBase64String(new byte[64]))).Succeeded);
    }

    private static ManageLinkSettings Settings(string hmacKey) => new()
    {
        HmacKey = hmacKey,
    };
}
