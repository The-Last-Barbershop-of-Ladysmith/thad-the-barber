using Microsoft.AspNetCore.StaticFiles;

namespace ThadTheBarber.ReportViewer.Features.Reports;

/// <summary>Maps request paths to blob names in the reports container.</summary>
public static class ReportPath
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    /// <summary>
    /// The blob name for a request path, without leading or trailing slashes (empty for the root). Null when a segment
    /// is <c>.</c> or <c>..</c> or contains a backslash, so a path can't climb out of the folder it names.
    /// </summary>
    public static string? Normalize(string? path)
    {
        string[] segments = (path ?? string.Empty).Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Any(segment => segment is "." or ".." || segment.Contains('\\'))
            ? null
            : string.Join('/', segments);
    }

    /// <summary>The prefix that lists a folder's contents: <c>pr/12/</c> for <c>pr/12</c>, empty for the root.</summary>
    public static string FolderPrefix(string folder) => folder.Length == 0 ? string.Empty : $"{folder}/";

    public static string IndexOf(string folder) => $"{FolderPrefix(folder)}index.html";

    /// <summary>The folder's URL with a trailing slash, so relative links in its reports resolve inside it.</summary>
    public static string FolderUrl(string folder) =>
        $"/{string.Concat(folder.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(segment => $"{Uri.EscapeDataString(segment)}/"))}";

    public static string ContentTypeOf(string blobName) =>
        ContentTypes.TryGetContentType(blobName, out string? contentType) ? contentType : "application/octet-stream";
}
