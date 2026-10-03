using Microsoft.Net.Http.Headers;
using ThadTheBarber.ReportViewer.Storage;

namespace ThadTheBarber.ReportViewer.Features.Reports;

public static class ReportEndpoints
{
    /// <summary>
    /// Every GET is a path in the reports container: a file is served as-is, a folder serves its <c>index.html</c> or,
    /// without one, a listing. App Service authentication signs the viewer in before a request gets here.
    /// </summary>
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/{**path}", GetAsync);
        return app;
    }

    private static async Task<IResult> GetAsync(string? path, HttpRequest request, IReportStore store, CancellationToken cancellationToken)
    {
        if (ReportPath.Normalize(path) is not string name)
        {
            return Results.BadRequest();
        }

        bool isFolderUrl = name.Length == 0 || request.Path.Value!.EndsWith('/');
        if (!isFolderUrl)
        {
            if (await store.OpenAsync(name, cancellationToken) is ReportFile file)
            {
                return Serve(name, file);
            }

            IReadOnlyList<ReportEntry> children = await store.ListAsync(ReportPath.FolderPrefix(name), cancellationToken);
            return children.Count > 0 ? Results.Redirect(ReportPath.FolderUrl(name)) : Results.NotFound();
        }

        if (await store.OpenAsync(ReportPath.IndexOf(name), cancellationToken) is ReportFile index)
        {
            return Serve(ReportPath.IndexOf(name), index);
        }

        IReadOnlyList<ReportEntry> entries = await store.ListAsync(ReportPath.FolderPrefix(name), cancellationToken);
        return entries.Count == 0 && name.Length > 0
            ? Results.NotFound()
            : Results.Content(FolderListing.ToHtml(name, entries), "text/html; charset=utf-8");
    }

    private static IResult Serve(string blobName, ReportFile file) =>
        Results.Stream(
            file.Content,
            ReportPath.ContentTypeOf(blobName),
            lastModified: file.LastModified,
            entityTag: EntityTagHeaderValue.Parse(file.ETag));
}
