using ThadTheBarber.ReportViewer.Features.Reports;

namespace ThadTheBarber.ReportViewer.Tests.Features.Reports;

public sealed class ReportPathTests
{
    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("/", "")]
    [InlineData("pr/7/100/e2e/", "pr/7/100/e2e")]
    [InlineData("pr//7/index.html", "pr/7/index.html")]
    [InlineData("pr/7/100/lighthouse/home.report.html", "pr/7/100/lighthouse/home.report.html")]
    public void NormalizeMapsPathToBlobName(string? path, string expected) =>
        Assert.Equal(expected, ReportPath.Normalize(path));

    [Theory]
    [InlineData("..")]
    [InlineData("pr/../secret.html")]
    [InlineData("pr/7/..")]
    [InlineData("pr/./7")]
    [InlineData("pr\\..\\secret.html")]
    public void NormalizeRejectsTraversal(string path) =>
        Assert.Null(ReportPath.Normalize(path));

    [Theory]
    [InlineData("", "index.html")]
    [InlineData("pr/7/100/e2e", "pr/7/100/e2e/index.html")]
    public void FolderMapsToItsIndex(string folder, string expected) =>
        Assert.Equal(expected, ReportPath.IndexOf(folder));

    [Theory]
    [InlineData("pr/7", "/pr/7/")]
    [InlineData("a b/c", "/a%20b/c/")]
    public void FolderUrlEndsInASlash(string folder, string expected) =>
        Assert.Equal(expected, ReportPath.FolderUrl(folder));

    [Theory]
    [InlineData("index.html", "text/html")]
    [InlineData("trace/sw.bundle.js", "text/javascript")]
    [InlineData("styles.css", "text/css")]
    [InlineData("results.json", "application/json")]
    [InlineData("data/screenshot.png", "image/png")]
    [InlineData("data/video.webm", "video/webm")]
    [InlineData("data/trace.zip", "application/x-zip-compressed")]
    [InlineData("data/no-extension", "application/octet-stream")]
    public void ContentTypeFollowsTheExtension(string blobName, string expected) =>
        Assert.Equal(expected, ReportPath.ContentTypeOf(blobName));
}
