using ThadTheBarber.Api.Common.Models;

namespace ThadTheBarber.Api.Common.Extensions;

/// <summary>
/// Calendar days in a timezone (e.g. the shop's, from <c>TimeZoneInfo.FindSystemTimeZoneById("America/New_York")</c>).
/// Times travel as UTC instants; these answer which local date an instant falls on and which UTC range a local date
/// covers.
/// </summary>
public static class TimeZoneInfoExtensions
{
    public static DateOnly ToLocalDate(this TimeZoneInfo timeZone, DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, timeZone).DateTime);

    /// <summary>The day is 23 or 25 hours long when the clocks change.</summary>
    public static DateTimeRange GetDayRange(this TimeZoneInfo timeZone, DateOnly date) => new(
        timeZone.GetStartOfDay(date),
        timeZone.GetStartOfDay(date.AddDays(1))
    );

    /// <summary>The whole calendar month that <paramref name="date"/> falls in.</summary>
    public static DateTimeRange GetMonthRange(this TimeZoneInfo timeZone, DateOnly date)
    {
        DateOnly firstDay = new(date.Year, date.Month, 1);
        return new DateTimeRange(
            timeZone.GetStartOfDay(firstDay),
            timeZone.GetStartOfDay(firstDay.AddMonths(1))
        );
    }

    /// <summary>
    /// Midnight; where clocks spring forward at midnight, the moment they jump (a skipped time gets the standard
    /// offset, the one before the jump); where they fall back at midnight, its first occurrence.
    /// </summary>
    private static DateTimeOffset GetStartOfDay(this TimeZoneInfo timeZone, DateOnly date)
    {
        DateTime midnight = date.ToDateTime(TimeOnly.MinValue);
        TimeSpan offset = timeZone.GetUtcOffset(midnight);
        if (timeZone.IsAmbiguousTime(midnight))
        {
            offset = timeZone.GetAmbiguousTimeOffsets(midnight).Max();
        }

        return new DateTimeOffset(midnight, offset);
    }
}
