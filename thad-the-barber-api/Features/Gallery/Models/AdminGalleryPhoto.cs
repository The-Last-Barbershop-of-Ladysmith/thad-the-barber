namespace ThadTheBarber.Api.Features.Gallery.Models;

/// <summary>A gallery photo as the admin sees it: its file name (how it is deleted), where it loads from, and its alt text.</summary>
public sealed record AdminGalleryPhoto(
    string FileName,
    string Src,
    string AltText,
    DateTimeOffset UploadedAt
);
