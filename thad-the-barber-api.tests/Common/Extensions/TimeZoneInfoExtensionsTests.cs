using System.Globalization;
using FsCheck.Xunit;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Tests.TestSupport.Generators;

namespace ThadTheBarber.Api.Tests.Common.Extensions;

public sealed class TimeZoneInfoExtensionsTests
{
    private readonly TimeZoneInfo _newYork = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

    [Theory]
    [InlineData("2026-10-05T14:00:00Z", "2026-10-05")]
    [InlineData("2026-10-06T03:30:00Z", "2026-10-05")]
    [InlineData("2026-10-06T04:00:00Z", "2026-10-06")]
    [InlineData("2026-11-01T05:30:00Z", "2026-11-01")]
    [InlineData("2026-11-02T04:30:00Z", "2026-11-01")]
    [InlineData("2026-03-08T04:59:00Z", "2026-03-07")]
    [InlineData("2026-03-08T05:00:00Z", "2026-03-08")]
    public void InstantsFallOnTheLocalDate(string utc, string localDate)
    {
        Assert.Equal(ParseDate(localDate), _newYork.ToLocalDate(ParseInstant(utc)));
    }

    [Theory]
    [InlineData("2026-10-10", "2026-10-10T04:00:00Z", "2026-10-11T04:00:00Z", 24)]
    [InlineData("2026-03-08", "2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z", 23)]
    [InlineData("2026-11-01", "2026-11-01T04:00:00Z", "2026-11-02T05:00:00Z", 25)]
    public void ADayCoversItsUtcRangeAcrossDst(string localDate, string start, string end, int hours)
    {
        DateTimeRange day = _newYork.GetDayRange(ParseDate(localDate));

        Assert.Equal(
            new DateTimeRange(
                ParseInstant(start),
                ParseInstant(end)
            ),
            day);
        Assert.Equal(TimeSpan.FromHours(hours), day.End - day.Start);
    }

    [Property(Arbitrary = new[] { typeof(TimeZoneArbitraries) })]
    public void EveryDayStartsAndEndsOnItsOwnDate(ZonedDate zonedDate)
    {
        DateTimeRange day = zonedDate.TimeZone.GetDayRange(zonedDate.Date);

        Assert.Equal(zonedDate.Date, zonedDate.TimeZone.ToLocalDate(day.Start));
        Assert.Equal(zonedDate.Date, zonedDate.TimeZone.ToLocalDate(day.End.AddSeconds(-1)));
        Assert.Equal(zonedDate.Date.AddDays(-1), zonedDate.TimeZone.ToLocalDate(day.Start.AddSeconds(-1)));
        Assert.InRange(day.End - day.Start, TimeSpan.FromHours(23), TimeSpan.FromHours(25));
    }

    [Fact]
    public void ADayWhoseMidnightIsSkippedStartsWhenTheClocksJump()
    {
        TimeZoneInfo santiago = TimeZoneInfo.FindSystemTimeZoneById("America/Santiago");
        DateOnly skipped = Enumerable.Range(0, 366)
            .Select(day => new DateOnly(2026, 1, 1).AddDays(day))
            .First(date => santiago.IsInvalidTime(date.ToDateTime(TimeOnly.MinValue)));

        DateTimeRange day = santiago.GetDayRange(skipped);

        Assert.Equal(skipped, santiago.ToLocalDate(day.Start));
        // A whole second: .NET misplaces sub-second instants in the last second before this transition.
        Assert.Equal(skipped.AddDays(-1), santiago.ToLocalDate(day.Start.AddSeconds(-1)));
        Assert.Equal(new TimeOnly(1, 0), TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(day.Start, santiago).DateTime));
    }

    private static DateOnly ParseDate(string date) => DateOnly.Parse(date, CultureInfo.InvariantCulture);

    private static DateTimeOffset ParseInstant(string utc) => DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture);
}
