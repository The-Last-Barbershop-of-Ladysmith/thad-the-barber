using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Infrastructure.Storage.Services;

/// <summary>
/// Says what an uploaded file really is from its first bytes, never from its name or the content type the browser
/// sent, so a renamed script or page can't be stored as a photo. The formats are the ones the gallery lists (BR-34).
/// </summary>
public static class ImageFileInspector
{
    /// <summary>The largest upload accepted, in bytes. The admin page shrinks photos first; this is the safety net.</summary>
    public const int MaxBytes = 25 * 1024 * 1024;

    private static readonly ImageKind Jpeg = new(".jpg", "image/jpeg");
    private static readonly ImageKind Png = new(".png", "image/png");
    private static readonly ImageKind Webp = new(".webp", "image/webp");
    private static readonly ImageKind Avif = new(".avif", "image/avif");

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    /// <summary>The kind of image the bytes are, or null when they are not a JPEG, PNG, WebP or AVIF.</summary>
    public static ImageKind? Inspect(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return Jpeg;
        }

        if (bytes.StartsWith(PngSignature))
        {
            return Png;
        }

        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
        {
            return Webp;
        }

        // An AVIF is an ISO base media file: a size, "ftyp", then its major brand.
        if (bytes.Length >= 12 && bytes[4..8].SequenceEqual("ftyp"u8)
            && (bytes[8..12].SequenceEqual("avif"u8) || bytes[8..12].SequenceEqual("avis"u8)))
        {
            return Avif;
        }

        return null;
    }
}
