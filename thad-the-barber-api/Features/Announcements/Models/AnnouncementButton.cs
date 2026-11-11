namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>A button under an announcement. <see cref="Url"/> is a site path, an https link, or a tel: or mailto: link.</summary>
public sealed record AnnouncementButton(
    string Label,
    string Url,
    AnnouncementButtonVariant Variant
);
