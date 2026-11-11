using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Infrastructure.Storage.Services;

/// <summary>
/// Reads the environment's storage account with the API's managed identity: the photos and announcement images in
/// the media container, and the private content container that holds <c>announcements.json</c>. Anonymous listing is
/// off on both, so nothing but the API can see what's there.
/// </summary>
public interface IMediaStorage
{
    /// <summary>The blobs directly under <paramref name="prefix"/> ("gallery/"), without those in sub-folders.</summary>
    Task<List<StoredBlob>> ListAsync(string container, string prefix, CancellationToken cancellationToken);

    /// <summary>The text of a blob, or null when there is no such blob.</summary>
    Task<string?> ReadTextAsync(string container, string blobName, CancellationToken cancellationToken);
}
