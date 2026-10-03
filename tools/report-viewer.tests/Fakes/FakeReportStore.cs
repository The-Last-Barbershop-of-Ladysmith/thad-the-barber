using System.Text;
using ThadTheBarber.ReportViewer.Storage;

namespace ThadTheBarber.ReportViewer.Tests.Fakes;

/// <summary>An in-memory reports container: blob name → content.</summary>
internal sealed class FakeReportStore(Dictionary<string, string> blobs) : IReportStore
{
    public static readonly DateTimeOffset LastModified = new(2026, 10, 1, 12, 0, 0, TimeSpan.Zero);

    public Task<ReportFile?> OpenAsync(string blobName, CancellationToken cancellationToken) =>
        Task.FromResult(blobs.TryGetValue(blobName, out string? content)
            ? new ReportFile(new MemoryStream(Encoding.UTF8.GetBytes(content)), LastModified, $"\"{blobName.GetHashCode():x}\"")
            : null);

    public Task<IReadOnlyList<ReportEntry>> ListAsync(string prefix, CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<ReportEntry>>([.. blobs.Keys
            .Where(name => name.StartsWith(prefix, StringComparison.Ordinal))
            .Select(name => name[prefix.Length..])
            .Select(rest => rest.Split('/', 2) is [string folder, _]
                ? new ReportEntry(folder, IsFolder: true)
                : new ReportEntry(rest, IsFolder: false))
            .Distinct()]);
}
