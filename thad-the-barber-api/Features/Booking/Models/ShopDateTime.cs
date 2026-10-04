using System.Globalization;

namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>A wall-clock date and time at the shop, in the key formats the UI uses.</summary>
public readonly record struct ShopDateTime(DateOnly Date, TimeOnly Time)
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string TimeFormat = "HH:mm";

    /// <summary>"2026-10-03"</summary>
    public string DateKey => Date.ToString(DateFormat, CultureInfo.InvariantCulture);

    /// <summary>"14:30"</summary>
    public string TimeKey => Time.ToString(TimeFormat, CultureInfo.InvariantCulture);

    /// <summary>"2:30 PM"</summary>
    public string Label => Time.ToString("h:mm tt", CultureInfo.InvariantCulture);

    public static ShopDateTime Parse(string dateKey, string timeKey) => new(
        DateOnly.ParseExact(dateKey, DateFormat, CultureInfo.InvariantCulture),
        TimeOnly.ParseExact(timeKey, TimeFormat, CultureInfo.InvariantCulture));
}
