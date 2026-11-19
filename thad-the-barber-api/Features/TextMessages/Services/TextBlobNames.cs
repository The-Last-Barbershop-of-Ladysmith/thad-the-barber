namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>Where the texting blobs live in the private content container (the opt-ins are in <c>MarketingOptInService</c>).</summary>
public static class TextBlobNames
{
    public const string ReminderPrefix = "reminders/";

    public static string Confirmation(string bookingId) => $"confirmations/{bookingId}.json";

    /// <summary>A day's reminders are listed together, so a run reads only the days it can send for.</summary>
    public static string ReminderDayPrefix(DateOnly startDate) => $"{ReminderPrefix}{startDate:yyyy-MM-dd}/";

    public static string Reminder(DateOnly startDate, string bookingId) => $"{ReminderDayPrefix(startDate)}{bookingId}.json";

    public static string AnnouncementSend(string announcementId) => $"announcement-sends/{announcementId}.json";

    /// <summary>The month's log of texts sent, one JSON line per text (never the phone or the message).</summary>
    public static string Log(DateTimeOffset month) => $"messages/{month:yyyy-MM}.jsonl";
}
