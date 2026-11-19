namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>
/// One booking's reminder, <c>reminders/&lt;shop-local start date&gt;/&lt;booking id&gt;.json</c>. The blob is both the to-do and the
/// record: a run takes it with an ETag write (Pending to Claimed), so two runs never both send it.
/// </summary>
public sealed record ReminderJob(
    string BookingId,
    string Phone,
    DateTimeOffset StartAt,
    ReminderState State,
    DateTimeOffset? FinishedAt,
    string? MessageSid
);
