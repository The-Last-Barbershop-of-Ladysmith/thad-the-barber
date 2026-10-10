using FsCheck;
using FsCheck.Fluent;

namespace ThadTheBarber.Api.Tests.TestSupport.Generators;

/// <summary>
/// Dates from 2000 to 2060 in zones with awkward clocks: US DST, none, DST at midnight, half-hour DST and 45-minute
/// offsets. Clock changes are a few days a year, so most dates are picked on or next to one.
/// </summary>
public static class TimeZoneArbitraries
{
    private static readonly string[] timeZoneIds =
    [
        "America/New_York",
        "America/Phoenix",
        "America/Santiago",
        "Europe/London",
        "Australia/Lord_Howe",
        "Asia/Kathmandu",
        "Pacific/Chatham",
    ];

    public static Arbitrary<ZonedDate> ZonedDates() => Arb.From(
        from timeZone in Gen.Elements(timeZoneIds.Select(TimeZoneInfo.FindSystemTimeZoneById))
        from year in Gen.Choose(2000, 2060)
        from date in Gen.Frequency(
            (3, Gen.Elements(GetClockChangeDays(timeZone, year).DefaultIfEmpty(new DateOnly(year, 1, 1)))),
            (1, Gen.Choose(0, 364).Select(day => new DateOnly(year, 1, 1).AddDays(day)))
        )
        select new ZonedDate(
            timeZone,
            date
        )
    );

    /// <summary>Each day whose clocks change, with the days either side.</summary>
    private static List<DateOnly> GetClockChangeDays(TimeZoneInfo timeZone, int year)
    {
        DateOnly firstDay = new(year, 1, 1);

        return Enumerable.Range(0, 365)
            .Select(firstDay.AddDays)
            .Where(day => timeZone.GetUtcOffset(day.ToDateTime(TimeOnly.MinValue)) != timeZone.GetUtcOffset(day.AddDays(1).ToDateTime(TimeOnly.MinValue))
                || timeZone.IsInvalidTime(day.ToDateTime(TimeOnly.MinValue))
                || timeZone.IsAmbiguousTime(day.ToDateTime(TimeOnly.MinValue)))
            .SelectMany(day => new[] { day.AddDays(-1), day, day.AddDays(1) })
            .ToList();
    }
}
