using System.Globalization;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>The wording of the booking texts. Each carries the unique manage link and "Reply STOP to opt out", which carriers expect.</summary>
public static class BookingTextMessages
{
    public static string Confirmation(string shopName, TimeZoneInfo zone, DateTimeOffset startAt, string manageLink) =>
        $"{shopName}: you're booked for {Format(zone, startAt)}. See, change or cancel it here: {manageLink} Reply STOP to opt out.";

    public static string Reminder(string shopName, TimeZoneInfo zone, DateTimeOffset startAt, string manageLink) =>
        $"{shopName}: a reminder that you're booked for {Format(zone, startAt)}. Need to change or cancel? {manageLink} Reply STOP to opt out.";

    /// <summary>The time on the shop's clock, like "Fri, Nov 20 at 3:30 PM" (every booking time shows there).</summary>
    public static string Format(TimeZoneInfo zone, DateTimeOffset instant) =>
        TimeZoneInfo.ConvertTime(instant, zone).ToString("ddd, MMM d 'at' h:mm tt", CultureInfo.InvariantCulture);
}
