using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// The storage account, in memory: the blobs in the gallery folder and the text files in the content container. Set
/// <see cref="Failure"/> to make every call throw, like storage being down.
/// </summary>
public sealed class FakeMediaStorage : IMediaStorage
{
    public List<StoredBlob> GalleryBlobs { get; set; } =
    [
        new StoredBlob("gallery/older_print.jpg", new DateTimeOffset(2026, 10, 1, 10, 0, 0, TimeSpan.Zero)),
        new StoredBlob("gallery/newer-print.webp", new DateTimeOffset(2026, 10, 3, 10, 0, 0, TimeSpan.Zero)),
    ];

    /// <summary>Text files by name; a name with no entry doesn't exist.</summary>
    public Dictionary<string, string> ContentFiles { get; } = [];

    /// <summary>Image files written through <see cref="WriteNewBytesAsync"/> by blob name, with the content type given.</summary>
    public Dictionary<string, (byte[] Bytes, string ContentType)> MediaFiles { get; } = [];

    public Exception? Failure { get; set; }

    public int Calls { get; set; }

    public Task<List<StoredBlob>> ListAsync(string container, string prefix, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        return Task.FromResult(GalleryBlobs.Where(blob => blob.Name.StartsWith(prefix, StringComparison.Ordinal)).ToList());
    }

    public Task<string?> ReadTextAsync(string container, string blobName, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        return Task.FromResult(ContentFiles.GetValueOrDefault(blobName));
    }

    public Task WriteNewTextAsync(string container, string blobName, string text, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        if (!ContentFiles.TryAdd(blobName, text))
        {
            throw new InvalidOperationException($"{blobName} already exists.");
        }

        return Task.CompletedTask;
    }

    public Task WriteTextAsync(string container, string blobName, string text, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        ContentFiles[blobName] = text;
        return Task.CompletedTask;
    }

    public Task WriteNewBytesAsync(string container, string blobName, byte[] bytes, string contentType, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        if (!MediaFiles.TryAdd(blobName, (bytes, contentType)))
        {
            throw new InvalidOperationException($"{blobName} already exists.");
        }

        GalleryBlobs.Add(new StoredBlob(blobName, DateTimeOffset.UtcNow));
        return Task.CompletedTask;
    }

    public Task<bool> DeleteAsync(string container, string blobName, CancellationToken cancellationToken)
    {
        Calls++;
        if (Failure is not null)
        {
            throw Failure;
        }

        bool removed = MediaFiles.Remove(blobName);
        removed |= GalleryBlobs.RemoveAll(blob => blob.Name == blobName) > 0;
        return Task.FromResult(removed);
    }
}
