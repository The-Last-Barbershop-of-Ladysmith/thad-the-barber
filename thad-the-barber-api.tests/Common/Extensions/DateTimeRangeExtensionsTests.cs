using System.Globalization;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Common.Models;

namespace ThadTheBarber.Api.Tests.Common.Extensions;

public sealed class DateTimeRangeExtensionsTests
{
    [Theory]
    [InlineData("10:00", "12:00", "11:00", "13:00", "11:00", "12:00")]
    [InlineData("11:00", "13:00", "10:00", "12:00", "11:00", "12:00")]
    [InlineData("10:00", "14:00", "11:00", "12:00", "11:00", "12:00")]
    [InlineData("10:00", "12:00", "10:00", "12:00", "10:00", "12:00")]
    [InlineData("10:00", "10:01", "10:00", "12:00", "10:00", "10:01")]
    public void OverlappingRangesShareTheirCommonPart(string start, string end, string otherStart, string otherEnd, string expectedStart, string expectedEnd)
    {
        DateTimeRange? intersection = Range(start, end).Intersect(Range(otherStart, otherEnd));

        Assert.Equal(Range(expectedStart, expectedEnd), intersection);
    }

    [Theory]
    [InlineData("10:00", "11:00", "11:00", "12:00")]
    [InlineData("11:00", "12:00", "10:00", "11:00")]
    [InlineData("10:00", "11:00", "12:00", "13:00")]
    public void RangesThatOnlyTouchOrAreApartDontIntersect(string start, string end, string otherStart, string otherEnd)
    {
        Assert.Null(Range(start, end).Intersect(Range(otherStart, otherEnd)));
    }

    [Fact]
    public void ALongRangeSplitsIntoFullPiecesAndAShorterLastOne()
    {
        List<DateTimeRange> pieces = Range("10:00", "12:30").Split(TimeSpan.FromHours(1));

        Assert.Equal(
            [
                Range("10:00", "11:00"),
                Range("11:00", "12:00"),
                Range("12:00", "12:30"),
            ],
            pieces);
    }

    [Theory]
    [InlineData("10:00", "11:00")]
    [InlineData("10:00", "10:30")]
    public void ARangeNoLongerThanOnePieceStaysWhole(string start, string end)
    {
        Assert.Equal([Range(start, end)], Range(start, end).Split(TimeSpan.FromHours(1)));
    }

    [Fact]
    public void AnEmptyRangeHasNoPieces()
    {
        Assert.Empty(Range("10:00", "10:00").Split(TimeSpan.FromHours(1)));
    }

    private static DateTimeRange Range(string start, string end) => new(
        At(start),
        At(end)
    );

    private static DateTimeOffset At(string time) =>
        DateTimeOffset.Parse($"2026-03-08T{time}:00Z", CultureInfo.InvariantCulture);
}
