namespace ThadTheBarber.ReportViewer.Storage;

/// <param name="ETag">Quoted, as sent in the <c>ETag</c> header.</param>
public sealed record ReportFile(
    Stream Content,
    DateTimeOffset LastModified,
    string ETag
);
