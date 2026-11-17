namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>Where an announcement is on the shop's calendar today (BR-30): shown, not started yet, or past its end day.</summary>
public enum AdminAnnouncementStatus
{
    Showing,
    Scheduled,
    Ended,
}
