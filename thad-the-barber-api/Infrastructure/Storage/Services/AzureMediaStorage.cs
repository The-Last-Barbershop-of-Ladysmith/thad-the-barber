using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Infrastructure.Storage.Services;

/// <summary>
/// The Azure Blob Storage side of <see cref="IMediaStorage"/>; too thin to test without Azure. A blob's upload time is
/// when it was created, which an edit to its metadata doesn't change.
/// </summary>
public sealed class AzureMediaStorage(BlobServiceClient blobService) : IMediaStorage
{
    public async Task<List<StoredBlob>> ListAsync(string container, string prefix, CancellationToken cancellationToken)
    {
        BlobContainerClient containerClient = blobService.GetBlobContainerClient(container);
        List<StoredBlob> blobs = [];
        await foreach (BlobHierarchyItem item in containerClient.GetBlobsByHierarchyAsync(
            traits: BlobTraits.None,
            states: BlobStates.None,
            delimiter: "/",
            prefix: prefix,
            cancellationToken: cancellationToken))
        {
            if (item.IsBlob)
            {
                blobs.Add(new StoredBlob(
                    item.Blob.Name,
                    item.Blob.Properties.CreatedOn ?? item.Blob.Properties.LastModified ?? DateTimeOffset.MinValue
                ));
            }
        }

        return blobs;
    }

    public async Task<string?> ReadTextAsync(string container, string blobName, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        try
        {
            BlobDownloadResult download = await blob.DownloadContentAsync(cancellationToken);
            // Files saved from Windows tools often start with a byte order mark, which JSON parsing rejects.
            return download.Content.ToString().TrimStart('\uFEFF');
        }
        catch (RequestFailedException exception) when (exception.Status == StatusCodes.Status404NotFound)
        {
            return null;
        }
    }
}
