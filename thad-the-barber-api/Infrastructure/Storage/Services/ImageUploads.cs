using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Infrastructure.Storage.Services;

/// <summary>Reads an uploaded form file into memory, refusing one over <see cref="ImageFileInspector.MaxBytes"/> without reading all of it.</summary>
public static class ImageUploads
{
    public static async Task<byte[]> ReadAsync(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            throw new InvalidImageException("Choose a photo to upload.");
        }

        if (file.Length > ImageFileInspector.MaxBytes)
        {
            throw new InvalidImageException($"The photo is too big. Use one under {ImageFileInspector.MaxBytes / (1024 * 1024)} MB.");
        }

        await using Stream stream = file.OpenReadStream();
        using MemoryStream buffer = new((int)file.Length);
        await stream.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }

    /// <summary>The kind of image the bytes are; a file that is empty, too big or not a JPEG, PNG, WebP or AVIF is refused.</summary>
    public static ImageKind InspectOrThrow(byte[] bytes)
    {
        if (bytes.Length == 0)
        {
            throw new InvalidImageException("Choose a photo to upload.");
        }

        if (bytes.Length > ImageFileInspector.MaxBytes)
        {
            throw new InvalidImageException($"The photo is too big. Use one under {ImageFileInspector.MaxBytes / (1024 * 1024)} MB.");
        }

        return ImageFileInspector.Inspect(bytes)
            ?? throw new InvalidImageException("Use a JPEG, PNG, WebP or AVIF photo.");
    }
}
