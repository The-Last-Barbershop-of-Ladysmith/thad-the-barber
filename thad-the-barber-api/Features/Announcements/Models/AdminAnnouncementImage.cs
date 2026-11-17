namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>An announcement's picture as the admin sees it: the stored file name to save back, and where it loads from to preview.</summary>
public sealed record AdminAnnouncementImage(
    string FileName,
    string AltText,
    AnnouncementImagePosition Position,
    string Src
);
