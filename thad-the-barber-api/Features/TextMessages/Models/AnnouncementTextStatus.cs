namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>Where an announcement's text is: waiting for its day, going out, or done, with how many were texted.</summary>
public sealed record AnnouncementTextStatus(
    string Id,
    AnnouncementSendState State,
    DateOnly SendOn,
    int Total,
    int SentCount,
    int FailedCount
);
