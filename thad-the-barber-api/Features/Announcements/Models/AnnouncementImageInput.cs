using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>
/// The picture to save: a file already in the media container's <c>announcements/</c> folder, named without any path.
/// Alt text is required, so every picture can be described to a screen reader.
/// </summary>
public sealed record AnnouncementImageInput(
    [Required, RegularExpression(@"^(?i)[a-z0-9][a-z0-9._ -]{0,99}\.(jpg|jpeg|png|webp|avif)$", ErrorMessage = "Use the name of an image file, with no folder.")] string FileName,
    [Required, MaxLength(250)] string AltText,
    AnnouncementImagePosition Position = AnnouncementImagePosition.Right
);
