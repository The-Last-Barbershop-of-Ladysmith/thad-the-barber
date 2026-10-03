using System.Globalization;
using System.Net;
using System.Text;
using ThadTheBarber.ReportViewer.Storage;

namespace ThadTheBarber.ReportViewer.Features.Reports;

/// <summary>The page for a folder without an <c>index.html</c>, e.g. every run of a PR.</summary>
public static class FolderListing
{
    /// <summary>
    /// Folders first. Numbered folders (PR numbers, run IDs) go newest first, i.e. highest number first; named ones
    /// (<c>e2e</c>, <c>deploy</c>) follow alphabetically. Files come last, alphabetically.
    /// </summary>
    public static IReadOnlyList<ReportEntry> Order(IEnumerable<ReportEntry> entries) =>
        [.. entries
            .OrderByDescending(entry => entry.IsFolder)
            .ThenByDescending(entry => entry.IsFolder ? NumberOf(entry.Name) : null)
            .ThenBy(entry => entry.Name, StringComparer.Ordinal)];

    public static string ToHtml(string folder, IEnumerable<ReportEntry> entries)
    {
        string title = WebUtility.HtmlEncode($"/{ReportPath.FolderPrefix(folder)}");
        StringBuilder html = new($$"""
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reports {{title}}</title>
            <style>body { font: 16px/1.6 system-ui, sans-serif; margin: 2rem auto; max-width: 48rem; padding: 0 1rem; }</style>
            </head>
            <body>
            <h1>{{title}}</h1>
            <ul>

            """);

        if (folder.Length > 0)
        {
            html.AppendLine("""<li><a href="../">../</a></li>""");
        }

        foreach (ReportEntry entry in Order(entries))
        {
            string name = entry.IsFolder ? $"{entry.Name}/" : entry.Name;
            string href = entry.IsFolder ? $"{Uri.EscapeDataString(entry.Name)}/" : Uri.EscapeDataString(entry.Name);
            html.AppendLine(CultureInfo.InvariantCulture, $"""<li><a href="{href}">{WebUtility.HtmlEncode(name)}</a></li>""");
        }

        html.Append("</ul>\n</body>\n</html>\n");
        return html.ToString();
    }

    private static long? NumberOf(string name) =>
        long.TryParse(name, NumberStyles.None, CultureInfo.InvariantCulture, out long number) ? number : null;
}
