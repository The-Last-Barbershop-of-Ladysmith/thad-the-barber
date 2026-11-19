using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
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

    public async Task WriteNewTextAsync(string container, string blobName, string text, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        BlobUploadOptions options = new()
        {
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All },
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json" },
        };
        await blob.UploadAsync(BinaryData.FromString(text), options, cancellationToken);
    }

    public async Task<bool> TryWriteNewTextAsync(string container, string blobName, string text, CancellationToken cancellationToken)
    {
        try
        {
            await WriteNewTextAsync(container, blobName, text, cancellationToken);
            return true;
        }
        catch (RequestFailedException exception) when (exception.Status is StatusCodes.Status409Conflict or StatusCodes.Status412PreconditionFailed)
        {
            return false;
        }
    }

    public async Task<StoredText?> ReadTextWithETagAsync(string container, string blobName, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        try
        {
            BlobDownloadResult download = await blob.DownloadContentAsync(cancellationToken);
            return new StoredText(download.Content.ToString().TrimStart('\uFEFF'), download.Details.ETag.ToString());
        }
        catch (RequestFailedException exception) when (exception.Status == StatusCodes.Status404NotFound)
        {
            return null;
        }
    }

    public async Task<bool> TryReplaceTextAsync(string container, string blobName, string text, string eTag, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        BlobUploadOptions options = new()
        {
            Conditions = new BlobRequestConditions { IfMatch = new ETag(eTag) },
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json" },
        };
        try
        {
            await blob.UploadAsync(BinaryData.FromString(text), options, cancellationToken);
            return true;
        }
        catch (RequestFailedException exception) when (exception.Status is StatusCodes.Status412PreconditionFailed or StatusCodes.Status404NotFound)
        {
            return false;
        }
    }

    public async Task AppendLineAsync(string container, string blobName, string line, CancellationToken cancellationToken)
    {
        AppendBlobClient blob = blobService.GetBlobContainerClient(container).GetAppendBlobClient(blobName);
        await blob.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
        using MemoryStream content = new(System.Text.Encoding.UTF8.GetBytes(line + "\n"));
        await blob.AppendBlockAsync(content, cancellationToken: cancellationToken);
    }

    public async Task WriteTextAsync(string container, string blobName, string text, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        BlobUploadOptions options = new()
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json" },
        };
        await blob.UploadAsync(BinaryData.FromString(text), options, cancellationToken);
    }

    public async Task WriteNewBytesAsync(string container, string blobName, byte[] bytes, string contentType, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        BlobUploadOptions options = new()
        {
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All },
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        };
        await blob.UploadAsync(BinaryData.FromBytes(bytes), options, cancellationToken);
    }

    public async Task<bool> DeleteAsync(string container, string blobName, CancellationToken cancellationToken)
    {
        BlobClient blob = blobService.GetBlobContainerClient(container).GetBlobClient(blobName);
        Azure.Response<bool> deleted = await blob.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        return deleted.Value;
    }
}
