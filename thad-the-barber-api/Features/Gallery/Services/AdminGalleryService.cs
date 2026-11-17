using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Features.Gallery.Exceptions;
using ThadTheBarber.Api.Features.Gallery.Mappers;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Gallery.Services;

/// <summary>
/// The admin's view of the media container's <c>gallery/</c> folder: the photos with their file names, adding one, and
/// deleting one. Unlike the public list (<see cref="GalleryService"/>), a folder that can't be read is an error here,
/// not an empty gallery. Every change marks the public list stale, so visitors see it at once.
/// </summary>
public sealed class AdminGalleryService(
    IMediaStorage storage,
    GalleryService gallery,
    IOptions<MediaStorageSettings> settings)
{
    public async Task<List<AdminGalleryPhoto>> GetAllAsync(CancellationToken cancellationToken)
    {
        MediaStorageSettings media = settings.Value;
        List<StoredBlob> blobs = await ListAsync(media, cancellationToken);
        return blobs.ToGalleryPhotos(media).Select(ToAdminPhoto).ToList();
    }

    /// <summary>Stores the image as the photo whose alt text is <paramref name="altText"/>; its name is made from those words.</summary>
    public async Task<AdminGalleryPhoto> UploadAsync(byte[] bytes, string? altText, CancellationToken cancellationToken)
    {
        string stem = GalleryFileNameMapper.ToStem(altText ?? string.Empty);
        if (stem.Length == 0 || (altText ?? string.Empty).Trim().Length > GalleryFileNameMapper.MaxAltTextLength)
        {
            throw new InvalidImageException(
                $"Describe the photo in up to {GalleryFileNameMapper.MaxAltTextLength} characters, using letters or numbers.");
        }

        ImageKind kind = ImageUploads.InspectOrThrow(bytes);
        MediaStorageSettings media = settings.Value;
        List<StoredBlob> existing = await ListAsync(media, cancellationToken);
        HashSet<string> taken = existing.Select(blob => blob.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        string fileName = GalleryFileNameMapper.ToUniqueName(
            stem,
            kind.Extension,
            name => taken.Contains(GalleryMapper.FolderPrefix + name));
        try
        {
            await storage.WriteNewBytesAsync(
                media.MediaContainerName,
                GalleryMapper.FolderPrefix + fileName,
                bytes,
                kind.ContentType,
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new GalleryUnavailableException("The photo couldn't be saved.", exception);
        }

        gallery.MarkStale();
        List<AdminGalleryPhoto> photos = await GetAllAsync(cancellationToken);
        return photos.Single(photo => photo.FileName == fileName);
    }

    public async Task DeleteAsync(string fileName, CancellationToken cancellationToken)
    {
        if (!GalleryFileNameMapper.IsSafeFileName(fileName))
        {
            throw new PhotoNotFoundException();
        }

        bool isDeleted;
        try
        {
            isDeleted = await storage.DeleteAsync(
                settings.Value.MediaContainerName,
                GalleryMapper.FolderPrefix + fileName,
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new GalleryUnavailableException("The photo couldn't be deleted.", exception);
        }

        if (!isDeleted)
        {
            throw new PhotoNotFoundException();
        }

        gallery.MarkStale();
    }

    private async Task<List<StoredBlob>> ListAsync(MediaStorageSettings media, CancellationToken cancellationToken)
    {
        try
        {
            return await storage.ListAsync(media.MediaContainerName, GalleryMapper.FolderPrefix, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new GalleryUnavailableException("The gallery folder couldn't be read.", exception);
        }
    }

    /// <summary>The public photo has only its URL, whose last segment is the stored file name.</summary>
    private static AdminGalleryPhoto ToAdminPhoto(GalleryPhoto photo)
    {
        string fileName = Uri.UnescapeDataString(photo.Src[(photo.Src.LastIndexOf('/') + 1)..]);
        return new AdminGalleryPhoto(fileName, photo.Src, photo.Alt, photo.UploadedAt);
    }
}
