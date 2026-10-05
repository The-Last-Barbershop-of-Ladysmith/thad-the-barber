using System.Globalization;
using ThadTheBarber.Api.Features.Booking.Services;

namespace ThadTheBarber.Api.Tests.Booking;

public sealed class ShopTimeZoneTests
{
    private readonly ShopTimeZone _shopTimeZone = ShopTimeZone.FromIanaId("America/New_York");

    [Theory]
    [InlineData("2026-10-05T14:00:00Z", "2026-10-05")]
    [InlineData("2026-10-06T03:30:00Z", "2026-10-05")]
    [InlineData("2026-10-06T04:00:00Z", "2026-10-06")]
    [InlineData("2026-11-01T05:30:00Z", "2026-11-01")]
    [InlineData("2026-11-02T04:30:00Z", "2026-11-01")]
    [InlineData("2026-03-08T04:59:00Z", "2026-03-07")]
    [InlineData("2026-03-08T05:00:00Z", "2026-03-08")]
    public void InstantsFallOnTheShopsDay(string utc, string shopDate)
    {
        Assert.Equal(ParseDate(shopDate), _shopTimeZone.ToShopDate(ParseInstant(utc)));
    }

    [Theory]
    [InlineData("2026-10-10", "2026-10-10T04:00:00Z", "2026-10-11T04:00:00Z", 24)]
    [InlineData("2026-03-08", "2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z", 23)]
    [InlineData("2026-11-01", "2026-11-01T04:00:00Z", "2026-11-02T05:00:00Z", 25)]
    public void ADayCoversItsUtcRangeAcrossDst(string shopDate, string start, string end, int hours)
    {
        (DateTimeOffset Start, DateTimeOffset End) range = _shopTimeZone.GetDayRange(ParseDate(shopDate));

        Assert.Equal((ParseInstant(start), ParseInstant(end)), range);
        Assert.Equal(TimeSpan.FromHours(hours), range.End - range.Start);
    }

    [Fact]
    public void ADayWhoseMidnightIsSkippedStartsWhenTheClocksJump()
    {
        ShopTimeZone santiago = ShopTimeZone.FromIanaId("America/Santiago");
        TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById("America/Santiago");
        DateOnly skipped = Enumerable.Range(0, 366)
            .Select(day => new DateOnly(2026, 1, 1).AddDays(day))
            .First(date => zone.IsInvalidTime(date.ToDateTime(TimeOnly.MinValue)));

        (DateTimeOffset Start, DateTimeOffset _) range = santiago.GetDayRange(skipped);

        Assert.Equal(skipped, santiago.ToShopDate(range.Start));
        // A whole second: .NET misplaces sub-second instants in the last second before this transition.
        Assert.Equal(skipped.AddDays(-1), santiago.ToShopDate(range.Start.AddSeconds(-1)));
        Assert.Equal(new TimeOnly(1, 0), TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(range.Start, zone).DateTime));
    }

    private static DateOnly ParseDate(string date) => DateOnly.Parse(date, CultureInfo.InvariantCulture);

    private static DateTimeOffset ParseInstant(string utc) => DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture);
}
