namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>An item of <c>announcements.json</c> for the admin list, whatever its dates, with its <see cref="Status"/> today.</summary>
public sealed record AdminAnnouncement(
    string Title,
    string BodyHtml,
    DateOnly StartDate,
    DateOnly EndDate,
    AdminAnnouncementImage? Image,
    List<AnnouncementButton> Buttons,
    AdminAnnouncementStatus Status
);
