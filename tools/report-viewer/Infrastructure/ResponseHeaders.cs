namespace ThadTheBarber.ReportViewer.Infrastructure;

public static class ResponseHeaders
{
    /// <summary>
    /// Browsers revalidate every response (ETags turn repeat views into 304s, which saves the F1 plan's outbound
    /// quota). Reports run their own scripts, so there's no script CSP; framing is limited to the viewer itself,
    /// which the Playwright trace viewer needs.
    /// </summary>
    public static IApplicationBuilder UseReportHeaders(this IApplicationBuilder app) =>
        app.Use((context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                IHeaderDictionary headers = context.Response.Headers;
                headers.CacheControl = "private, no-cache";
                headers.XContentTypeOptions = "nosniff";
                headers.ContentSecurityPolicy = "frame-ancestors 'self'";
                headers["Referrer-Policy"] = "no-referrer";
                return Task.CompletedTask;
            });
            return next(context);
        });
}
