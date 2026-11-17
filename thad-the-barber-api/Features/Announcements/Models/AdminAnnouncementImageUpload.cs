namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>An image just stored for an announcement: the file name to save with it, and where it loads from to preview.</summary>
public sealed record AdminAnnouncementImageUpload(
    string FileName,
    string Src
);
