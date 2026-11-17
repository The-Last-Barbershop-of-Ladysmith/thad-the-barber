namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>The first bytes of each image format the site accepts, enough for the file inspector to recognise.</summary>
public static class ImageBytes
{
    public static byte[] Jpeg { get; } = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];

    public static byte[] Png { get; } = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

    public static byte[] Webp { get; } = [.. "RIFF"u8, 0x24, 0x00, 0x00, 0x00, .. "WEBPVP8 "u8];

    public static byte[] Avif { get; } = [0x00, 0x00, 0x00, 0x1C, .. "ftypavif"u8, 0x00, 0x00, 0x00, 0x00];

    public static byte[] Script { get; } = "<script>alert(1)</script>"u8.ToArray();
}
