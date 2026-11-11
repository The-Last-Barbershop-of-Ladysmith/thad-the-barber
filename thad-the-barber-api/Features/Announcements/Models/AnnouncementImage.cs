namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>An announcement's picture, loaded by the browser straight from the media container's <c>announcements/</c> folder.</summary>
public sealed record AnnouncementImage(
    string Src,
    string Alt,
    AnnouncementImagePosition Position
);
