namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>
/// What sending the announcement would do. <see cref="Message"/> is the suggested wording, which the admin may edit.
/// <see cref="AlreadyTexted"/> is set when this announcement's text was already requested, with how far it got.
/// </summary>
public sealed record AnnouncementTextPreview(
    string Message,
    int SubscriberCount,
    bool IsEnabled,
    bool IsScheduled,
    AnnouncementTextStatus? AlreadyTexted
);
