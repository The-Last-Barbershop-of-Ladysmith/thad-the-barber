using ThadTheBarber.ReportViewer.Features.Reports;
using ThadTheBarber.ReportViewer.Storage;

namespace ThadTheBarber.ReportViewer.Tests.Features.Reports;

public sealed class FolderListingTests
{
    [Fact]
    public void NumberedFoldersComeNewestFirstThenNamedFoldersThenFiles()
    {
        ReportEntry[] entries =
        [
            new("summary.md", IsFolder: false),
            new("e2e", IsFolder: true),
            new("99", IsFolder: true),
            new("36665814258", IsFolder: true),
            new("100", IsFolder: true),
            new("coverage", IsFolder: true),
        ];

        IEnumerable<string> names = FolderListing.Order(entries).Select(entry => entry.Name);

        Assert.Equal(["36665814258", "100", "99", "coverage", "e2e", "summary.md"], names);
    }

    [Fact]
    public void ListingEncodesNamesAndLinksFolders()
    {
        string html = FolderListing.ToHtml("pr/7", [new("<b>", IsFolder: true), new("a b.html", IsFolder: false)]);

        Assert.Contains("""<a href="%3Cb%3E/">&lt;b&gt;/</a>""", html, StringComparison.Ordinal);
        Assert.Contains("""<a href="a%20b.html">a b.html</a>""", html, StringComparison.Ordinal);
        Assert.Contains("""<a href="../">../</a>""", html, StringComparison.Ordinal);
    }

    [Fact]
    public void RootHasNoParentLink() =>
        Assert.DoesNotContain("../", FolderListing.ToHtml(string.Empty, [new("pr", IsFolder: true)]), StringComparison.Ordinal);
}
