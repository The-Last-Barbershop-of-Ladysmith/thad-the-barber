using System.Net;
using Microsoft.AspNetCore.Http;

namespace ThadTheBarber.ReportViewer.Tests.Features.Reports;

public sealed class ViewerTests(ViewerFactory factory) : IClassFixture<ViewerFactory>
{
    private readonly HttpClient _client = factory.CreateClient(new() { AllowAutoRedirect = false });

    [Fact]
    public async Task FileIsServedWithItsContentType()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/100/coverage/styles.css");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/css", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("body {}", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task FolderServesItsIndex()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/100/e2e/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("<h1>e2e</h1>", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task FolderWithoutTrailingSlashRedirectsToIt()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/100/e2e");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/pr/7/100/e2e/", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task RedirectStaysOnTheViewer()
    {
        HttpContext context = await SendRawAsync("//pr/7");

        Assert.Equal("/pr/7/", context.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task FolderWithoutIndexListsRunsNewestFirst()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/");
        string html = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(html.IndexOf("href=\"100/\"", StringComparison.Ordinal) < html.IndexOf("href=\"99/\"", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RootListsTopLevelFolders()
    {
        using HttpResponseMessage response = await GetAsync("/");
        string html = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("href=\"deploy/\"", html, StringComparison.Ordinal);
        Assert.Contains("href=\"pr/\"", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FolderWithoutIndexListsItsFiles()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/100/lighthouse/");
        string html = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        Assert.Contains("href=\"home.report.html\"", html, StringComparison.Ordinal);
        Assert.Contains("href=\"book.report.html\"", html, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("/pr/7/missing.html")]
    [InlineData("/pr/404/")]
    [InlineData("/pr/404")]
    public async Task MissingPathIs404(string path)
    {
        using HttpResponseMessage response = await GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("/pr/../secret.html")]
    [InlineData("/pr/7/../../")]
    [InlineData(@"/pr/7/..\..\secret.html")]
    public async Task TraversalIsRejected(string path)
    {
        HttpContext context = await SendRawAsync(path);

        Assert.Equal(StatusCodes.Status400BadRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task UnchangedFileIs304()
    {
        using HttpResponseMessage first = await GetAsync("/pr/7/100/coverage/index.html");
        using HttpRequestMessage request = new(HttpMethod.Get, "/pr/7/100/coverage/index.html");
        request.Headers.IfNoneMatch.Add(first.Headers.ETag!);

        using HttpResponseMessage second = await _client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
    }

    [Fact]
    public async Task ResponsesAreRevalidatedAndNotSniffed()
    {
        using HttpResponseMessage response = await GetAsync("/pr/7/");

        Assert.True(response.Headers.CacheControl?.NoCache);
        Assert.True(response.Headers.CacheControl?.Private);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("frame-ancestors 'self'", response.Headers.GetValues("Content-Security-Policy").Single());
    }

    /// <summary>Sends the path as-is. HttpClient would resolve dot segments and read <c>//host</c> as a host first.</summary>
    private Task<HttpContext> SendRawAsync(string path) =>
        factory.Server.SendAsync(context =>
        {
            context.Request.Method = HttpMethods.Get;
            context.Request.Path = path;
        }, TestContext.Current.CancellationToken);

    private Task<HttpResponseMessage> GetAsync(string path) =>
        _client.GetAsync(path, TestContext.Current.CancellationToken);
}
