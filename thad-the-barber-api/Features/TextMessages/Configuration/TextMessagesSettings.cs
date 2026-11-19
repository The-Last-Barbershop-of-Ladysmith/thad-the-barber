namespace ThadTheBarber.Api.Features.TextMessages.Configuration;

/// <summary>
/// The shop's own booking texts (confirmation with the manage link, one reminder) and its announcement texts. Everything
/// stays off until <see cref="IsEnabled"/> is true, which is set only once Twilio is set up and the campaign is approved;
/// until then Square's own texts are the ones customers get, and turning both on would send two.
/// </summary>
public sealed class TextMessagesSettings
{
    public const string SectionName = "TextMessages";

    public bool IsEnabled { get; set; }

    /// <summary>The site customers open, <c>https://…</c> with no trailing slash needed; the manage link is built from it.</summary>
    public string SiteUrl { get; set; } = string.Empty;

    /// <summary>How long before a booking its reminder goes out. A booking made closer to its start than this gets no reminder.</summary>
    public TimeSpan ReminderLead { get; set; } = TimeSpan.FromHours(24);

    /// <summary>A reminder not sent by this long before the start is dropped, since it would arrive too late to help.</summary>
    public TimeSpan ReminderMinimumNotice { get; set; } = TimeSpan.FromHours(2);

    /// <summary>
    /// The hours of the shop's day (0 to 23) when the reminder run looks for reminders due. A few daytime hours keep
    /// texts out of the night and keep the storage reads few.
    /// </summary>
    public List<int> ReminderHours { get; set; } = [9, 12, 15, 18];
}
