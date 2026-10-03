using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace ThadTheBarber.ReportViewer.Storage;

public sealed class BlobReportStore(BlobContainerClient container) : IReportStore
{
    public async Task<ReportFile?> OpenAsync(string blobName, CancellationToken cancellationToken)
    {
        try
        {
            Response<BlobDownloadStreamingResult> response =
                await container.GetBlobClient(blobName).DownloadStreamingAsync(cancellationToken: cancellationToken);
            BlobDownloadDetails details = response.Value.Details;
            return new ReportFile(response.Value.Content, details.LastModified, details.ETag.ToString("H"));
        }
        catch (RequestFailedException e) when (e.Status == StatusCodes.Status404NotFound)
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<ReportEntry>> ListAsync(string prefix, CancellationToken cancellationToken)
    {
        List<ReportEntry> entries = [];
        await foreach (BlobHierarchyItem item in container.GetBlobsByHierarchyAsync(
            BlobTraits.None,
            BlobStates.None,
            delimiter: "/",
            prefix: prefix,
            cancellationToken: cancellationToken))
        {
            entries.Add(item.IsPrefix
                ? new ReportEntry(item.Prefix[prefix.Length..].TrimEnd('/'), IsFolder: true)
                : new ReportEntry(item.Blob.Name[prefix.Length..], IsFolder: false));
        }

        return entries;
    }
}
