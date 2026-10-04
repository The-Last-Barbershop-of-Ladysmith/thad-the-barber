using ThadTheBarber.Api.Features.Booking.Models;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// Converts between Square's UTC instants and wall-clock times in the shop's timezone (the Square location's IANA id,
/// e.g. <c>America/New_York</c>).
/// </summary>
public sealed class ShopTime(TimeZoneInfo timeZone)
{
    public static ShopTime ForTimeZone(string ianaId) => new(TimeZoneInfo.FindSystemTimeZoneById(ianaId));

    public ShopDateTime ToLocal(DateTimeOffset instant)
    {
        DateTime local = TimeZoneInfo.ConvertTime(instant, timeZone).DateTime;
        return new ShopDateTime(DateOnly.FromDateTime(local), TimeOnly.FromDateTime(local));
    }

    /// <summary>
    /// A time skipped when clocks spring forward doesn't exist and throws. A time repeated when they fall back means
    /// its first occurrence, the one still on daylight time.
    /// </summary>
    public DateTimeOffset ToInstant(ShopDateTime local)
    {
        DateTime wallClock = local.Date.ToDateTime(local.Time);
        if (timeZone.IsInvalidTime(wallClock))
        {
            throw new ArgumentOutOfRangeException(nameof(local), local, $"{local.DateKey} {local.TimeKey} doesn't exist in {timeZone.Id}.");
        }

        TimeSpan offset = timeZone.IsAmbiguousTime(wallClock)
            ? timeZone.GetAmbiguousTimeOffsets(wallClock).Max()
            : timeZone.GetUtcOffset(wallClock);
        return new DateTimeOffset(wallClock, offset);
    }
}
