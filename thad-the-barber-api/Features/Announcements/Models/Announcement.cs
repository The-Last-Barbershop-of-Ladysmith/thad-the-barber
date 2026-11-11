namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>An item of <c>announcements.json</c>, checked and ready to show on the days from start through end.</summary>
public sealed record Announcement(
    string Title,
    string BodyHtml,
    DateOnly StartDate,
    DateOnly EndDate,
    AnnouncementImage? Image,
    List<AnnouncementButton> Buttons
);
