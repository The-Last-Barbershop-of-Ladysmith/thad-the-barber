namespace ThadTheBarber.Api.Features.Gallery.Models;

/// <summary>A photo in the lookbook: where the browser loads it from, its alt text, and when Thad uploaded it.</summary>
public sealed record GalleryPhoto(
    string Src,
    string Alt,
    DateTimeOffset UploadedAt
);
