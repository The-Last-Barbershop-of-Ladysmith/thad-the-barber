namespace ThadTheBarber.Api.Features.TextMessages.Models;

public enum AnnouncementSendState
{
    /// <summary>Waiting for the announcement's first day; the daily check queues it then.</summary>
    Scheduled,

    /// <summary>Ready to go out; the next free worker takes it.</summary>
    Queued,

    /// <summary>A worker is texting the subscribers; one that stops for ten minutes loses it to the next.</summary>
    Sending,

    Done,
}
