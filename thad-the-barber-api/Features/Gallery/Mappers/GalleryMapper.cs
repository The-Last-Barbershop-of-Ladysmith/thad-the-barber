using System.Text.RegularExpressions;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Features.Gallery.Mappers;

/// <summary>BR-34: every supported image in the media container's <c>gallery/</c> folder, newest upload first.</summary>
public static partial class GalleryMapper
{
    public const string FolderPrefix = "gallery/";

    private static readonly HashSet<string> supportedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".avif",
    };

    public static List<GalleryPhoto> ToGalleryPhotos(this List<StoredBlob> blobs, MediaStorageSettings storage)
    {
        List<GalleryPhoto> photos = [];
        IEnumerable<StoredBlob> newestFirst = blobs
            .OrderByDescending(blob => blob.UploadedAt)
            .ThenBy(blob => blob.Name, StringComparer.Ordinal);
        foreach (StoredBlob blob in newestFirst)
        {
            if (!blob.Name.StartsWith(FolderPrefix, StringComparison.Ordinal))
            {
                continue;
            }

            string fileName = blob.Name[FolderPrefix.Length..];
            bool isSupportedImage = !fileName.Contains('/') && supportedExtensions.Contains(Path.GetExtension(fileName));
            if (isSupportedImage)
            {
                photos.Add(new GalleryPhoto(
                    storage.GetMediaUrl(FolderPrefix + Uri.EscapeDataString(fileName)),
                    ToAltText(fileName),
                    blob.UploadedAt
                ));
            }
        }

        return photos;
    }

    /// <summary><c>skin-fade_beard.jpg</c> becomes "Skin fade beard": naming the file is how Thad writes the alt text.</summary>
    public static string ToAltText(string fileName)
    {
        string words = SeparatorRuns().Replace(Path.GetFileNameWithoutExtension(fileName), " ").Trim();
        if (words.Length == 0)
        {
            return words;
        }

        return char.ToUpperInvariant(words[0]) + words[1..];
    }

    [GeneratedRegex(@"[-_\s]+")]
    private static partial Regex SeparatorRuns();
}
