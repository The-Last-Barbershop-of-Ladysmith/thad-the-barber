using ThadTheBarber.Api.Common.Models;

namespace ThadTheBarber.Api.Common.Extensions;

public static class DateTimeRangeExtensions
{
    /// <summary>The part both ranges cover, or null when they don't overlap.</summary>
    public static DateTimeRange? Intersect(this DateTimeRange range, DateTimeRange other)
    {
        DateTimeOffset start = range.Start;
        if (other.Start > start)
        {
            start = other.Start;
        }

        DateTimeOffset end = range.End;
        if (other.End < end)
        {
            end = other.End;
        }

        if (start >= end)
        {
            return null;
        }

        return new DateTimeRange(
            start,
            end
        );
    }

    /// <summary>Back-to-back pieces covering the range, none longer than <paramref name="maxLength"/>.</summary>
    public static List<DateTimeRange> Split(this DateTimeRange range, TimeSpan maxLength)
    {
        List<DateTimeRange> pieces = [];
        for (DateTimeOffset start = range.Start; start < range.End; start += maxLength)
        {
            DateTimeOffset end = start + maxLength;
            if (end > range.End)
            {
                end = range.End;
            }

            pieces.Add(new DateTimeRange(
                start,
                end
            ));
        }

        return pieces;
    }
}
