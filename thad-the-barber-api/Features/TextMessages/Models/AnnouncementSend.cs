namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>
/// One announcement's text, <c>announcement-sends/&lt;id&gt;.json</c>. Its being created at all is what makes a text go out
/// once: the id comes from the announcement's first day and title, and a second request for the same id finds the blob
/// already there. The message is frozen when the text is requested. <see cref="SentTo"/> lists, by the hash that names
/// their opt-in blob, everyone already handled, saved after each text so a crashed send resumes where it stopped.
/// </summary>
public sealed record AnnouncementSend(
    string Id,
    string Message,
    DateOnly SendOn,
    AnnouncementSendState State,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ClaimedAt,
    DateTimeOffset? DoneAt,
    int Total,
    int SentCount,
    int FailedCount,
    List<string> SentTo
);
