namespace ThadTheBarber.ReportViewer.Storage;

/// <summary>The reports container. <see cref="BlobReportStore"/> reads Blob Storage; tests use an in-memory fake.</summary>
public interface IReportStore
{
    /// <returns>The blob, or null when it doesn't exist.</returns>
    Task<ReportFile?> OpenAsync(string blobName, CancellationToken cancellationToken);

    /// <summary>The folders and files directly under <paramref name="prefix"/>, named relative to it.</summary>
    Task<IReadOnlyList<ReportEntry>> ListAsync(string prefix, CancellationToken cancellationToken);
}

/// <param name="ETag">Quoted, as sent in the <c>ETag</c> header.</param>
public sealed record ReportFile(Stream Content, DateTimeOffset LastModified, string ETag);

public sealed record ReportEntry(string Name, bool IsFolder);
