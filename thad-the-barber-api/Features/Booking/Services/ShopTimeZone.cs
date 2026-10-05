namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// The shop's timezone (the Square location's IANA id, e.g. <c>America/New_York</c>). Times travel as UTC instants;
/// this only answers which shop day an instant falls on and which UTC range a shop day covers.
/// </summary>
public sealed class ShopTimeZone(TimeZoneInfo timeZone)
{
    public static ShopTimeZone FromIanaId(string ianaId) => new(TimeZoneInfo.FindSystemTimeZoneById(ianaId));

    public DateOnly ToShopDate(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, timeZone).DateTime);

    /// <summary>
    /// From the day's first moment up to, but not including, the next day's. A day is 23 or 25 hours long when the
    /// clocks change.
    /// </summary>
    public (DateTimeOffset Start, DateTimeOffset End) GetDayRange(DateOnly date) => (StartOf(date), StartOf(date.AddDays(1)));

    /// <summary>
    /// Midnight; where clocks spring forward at midnight, the moment they jump; where they fall back at midnight, its
    /// first occurrence.
    /// </summary>
    private DateTimeOffset StartOf(DateOnly date)
    {
        DateTime midnight = date.ToDateTime(TimeOnly.MinValue);
        TimeSpan offset = timeZone.IsInvalidTime(midnight) ? timeZone.GetUtcOffset(midnight.AddTicks(-1))
            : timeZone.IsAmbiguousTime(midnight) ? timeZone.GetAmbiguousTimeOffsets(midnight).Max()
            : timeZone.GetUtcOffset(midnight);
        return new DateTimeOffset(midnight, offset);
    }
}
