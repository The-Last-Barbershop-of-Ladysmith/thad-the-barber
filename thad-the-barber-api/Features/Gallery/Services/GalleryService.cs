using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Gallery.Mappers;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Gallery.Services;

/// <summary>
/// The photos in the media container, kept by <see cref="StaleCache"/> until a change in the container marks them stale
/// (<see cref="MarkStale"/>). When storage can't be read and there is no copy yet, it's served as no photos,
/// so the page just shows its empty state.
/// </summary>
public sealed class GalleryService(
    IMediaStorage storage,
    StaleCache cache,
    IOptions<MediaStorageSettings> settings)
{
    public const string CacheKey = "media:gallery";

    public Task<List<GalleryPhoto>> GetAsync(CancellationToken cancellationToken) =>
        cache.GetOrRefreshAsync(CacheKey, () => FetchAsync(cancellationToken), [], cancellationToken);

    public void MarkStale() => cache.MarkStale<List<GalleryPhoto>>(CacheKey);

    private async Task<List<GalleryPhoto>> FetchAsync(CancellationToken cancellationToken)
    {
        MediaStorageSettings media = settings.Value;
        List<StoredBlob> blobs = await storage.ListAsync(media.MediaContainerName, GalleryMapper.FolderPrefix, cancellationToken);
        return blobs.ToGalleryPhotos(media);
    }
}
