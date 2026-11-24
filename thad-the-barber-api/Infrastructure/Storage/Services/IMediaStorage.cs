using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Infrastructure.Storage.Services;

/// <summary>
/// Reads the environment's storage account, and writes contact messages to it, with the API's managed identity: the
/// photos and announcement images in the media container, and the private content container that holds <c>announcements.json</c>. Anonymous listing is
/// off on both, so nothing but the API can see what's there.
/// </summary>
public interface IMediaStorage
{
    /// <summary>The blobs directly under <paramref name="prefix"/> ("gallery/"), without those in sub-folders.</summary>
    Task<List<StoredBlob>> ListAsync(string container, string prefix, CancellationToken cancellationToken);

    /// <summary>The text of a blob, or null when there is no such blob.</summary>
    Task<string?> ReadTextAsync(string container, string blobName, CancellationToken cancellationToken);

    /// <summary>Saves a new text blob, and fails instead of replacing one that has the same name.</summary>
    Task WriteNewTextAsync(string container, string blobName, string text, CancellationToken cancellationToken);

    /// <summary>Saves a new text blob; false, with nothing written, when a blob with that name already exists. Atomic, so one of two simultaneous calls wins.</summary>
    Task<bool> TryWriteNewTextAsync(string container, string blobName, string text, CancellationToken cancellationToken);

    /// <summary>The text of a blob and its ETag, or null when there is no such blob.</summary>
    Task<StoredText?> ReadTextWithETagAsync(string container, string blobName, CancellationToken cancellationToken);

    /// <summary>Replaces a text blob only while it still has <paramref name="eTag"/>; false, with nothing written, when it changed or was removed.</summary>
    Task<bool> TryReplaceTextAsync(string container, string blobName, string text, string eTag, CancellationToken cancellationToken);

    /// <summary>Adds one line to the end of an append blob, creating the blob first when there is none.</summary>
    Task AppendLineAsync(string container, string blobName, string line, CancellationToken cancellationToken);

    /// <summary>Saves a text blob, replacing any with the same name.</summary>
    Task WriteTextAsync(string container, string blobName, string text, CancellationToken cancellationToken);

    /// <summary>Saves a new file (an image), and fails instead of replacing one that has the same name.</summary>
    Task WriteNewBytesAsync(string container, string blobName, byte[] bytes, string contentType, CancellationToken cancellationToken);

    /// <summary>Removes a blob; false when there was none.</summary>
    Task<bool> DeleteAsync(string container, string blobName, CancellationToken cancellationToken);
}
