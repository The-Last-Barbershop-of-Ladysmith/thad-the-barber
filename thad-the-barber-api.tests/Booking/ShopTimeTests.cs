using System.Globalization;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;

namespace ThadTheBarber.Api.Tests.Booking;

public sealed class ShopTimeTests
{
    private readonly ShopTime _shop = ShopTime.ForTimeZone("America/New_York");

    [Theory]
    [InlineData("2026-10-05T14:00:00Z", "2026-10-05", "10:00")]
    [InlineData("2026-10-31T23:30:00Z", "2026-10-31", "19:30")]
    [InlineData("2026-11-01T14:00:00Z", "2026-11-01", "09:00")]
    [InlineData("2026-03-07T15:00:00Z", "2026-03-07", "10:00")]
    [InlineData("2026-03-08T14:00:00Z", "2026-03-08", "10:00")]
    [InlineData("2026-10-06T03:30:00Z", "2026-10-05", "23:30")]
    public void UtcBecomesShopLocalTimeOnBothSidesOfDst(string utc, string date, string time)
    {
        ShopDateTime local = _shop.ToLocal(DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture));

        Assert.Equal((date, time), (local.DateKey, local.TimeKey));
    }

    [Theory]
    [InlineData("2026-10-31", "10:00", "2026-10-31T14:00:00Z")]
    [InlineData("2026-11-01", "10:00", "2026-11-01T15:00:00Z")]
    [InlineData("2026-03-07", "10:00", "2026-03-07T15:00:00Z")]
    [InlineData("2026-03-08", "10:00", "2026-03-08T14:00:00Z")]
    public void ShopLocalTimeBecomesUtcOnBothSidesOfDst(string date, string time, string utc)
    {
        DateTimeOffset instant = _shop.ToInstant(ShopDateTime.Parse(date, time));

        Assert.Equal(DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture), instant);
    }

    [Fact]
    public void ATimeSkippedBySpringingForwardIsRejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => _shop.ToInstant(ShopDateTime.Parse("2026-03-08", "02:30")));
    }

    [Fact]
    public void ATimeRepeatedByFallingBackMeansItsDaylightTimeOccurrence()
    {
        DateTimeOffset instant = _shop.ToInstant(ShopDateTime.Parse("2026-11-01", "01:30"));

        Assert.Equal(TimeSpan.FromHours(-4), instant.Offset);
    }

    [Fact]
    public void LocalTimesRoundTrip()
    {
        ShopDateTime local = ShopDateTime.Parse("2026-11-01", "14:30");

        Assert.Equal(local, _shop.ToLocal(_shop.ToInstant(local)));
    }
}
