using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Endpoints;

public sealed class AdminAnnouncementsEndpointsTests
{
    private static readonly DateTimeOffset Today = new(2026, 10, 15, 16, 0, 0, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static HttpClient AdminClient(ApiFactory api)
    {
        HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key));
        return client;
    }

    private static StringContent Json(string body) => new(body, System.Text.Encoding.UTF8, "application/json");

    private static string Item(string title = "Holiday hours", string start = "2026-10-01", string end = "2026-10-31", string extra = "") =>
        $$"""{ "title": "{{title}}", "startDate": "{{start}}", "endDate": "{{end}}"{{extra}} }""";

    private static string List(params string[] items) => $$"""{ "items": [{{string.Join(",", items)}}] }""";

    [Fact]
    public async Task OnlyAnAdminSessionCanReadOrSave()
    {
        using ApiFactory api = new();

        using HttpResponseMessage visitorRead = await api.CreateClient().GetAsync("/api/admin/announcements", Cancellation);
        using HttpResponseMessage visitorSave = await api.CreateClient().PutAsync("/api/admin/announcements", Json(List()), Cancellation);
        using HttpResponseMessage anonymous = await api.CreateClientWithoutToken().GetAsync("/api/admin/announcements", Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, visitorRead.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorSave.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task TheAdminListHasEveryAnnouncementWithItsStatusAndStoredImage()
    {
        FakeMediaStorage storage = new();
        storage.ContentFiles["announcements.json"] = List(
            Item("Showing"),
            Item("Soon", "2026-11-01", "2026-11-30", """, "image": { "fileName": "soon.webp", "altText": "Soon", "position": "left" }"""));
        using ApiFactory api = new(time: new FakeTimeProvider(Today), media: storage);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.GetAsync("/api/admin/announcements", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(2, body.GetArrayLength());
        Assert.Equal("showing", body[0].GetProperty("status").GetString());
        Assert.Equal("scheduled", body[1].GetProperty("status").GetString());
        Assert.Equal("soon.webp", body[1].GetProperty("image").GetProperty("fileName").GetString());
        Assert.Equal("left", body[1].GetProperty("image").GetProperty("position").GetString());
    }

    [Fact]
    public async Task SavingReplacesTheListAndTheSiteShowsItAtOnce()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(time: new FakeTimeProvider(Today), media: storage);
        using HttpClient client = AdminClient(api);
        using HttpResponseMessage before = await api.CreateClient().GetAsync("/api/announcements", Cancellation);
        Assert.Equal(0, (await before.Content.ReadFromJsonAsync<JsonElement>(Cancellation)).GetArrayLength());

        using HttpResponseMessage saved = await client.PutAsync(
            "/api/admin/announcements",
            Json(List(Item("Open late", extra: """, "bodyHtml": "<p>Until 8</p>", "buttons": [{ "label": "Book", "url": "/book", "variant": "primary" }]"""))),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        JsonElement body = await saved.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("Open late", body[0].GetProperty("title").GetString());
        Assert.Equal("showing", body[0].GetProperty("status").GetString());
        using HttpResponseMessage after = await api.CreateClient().GetAsync("/api/announcements", Cancellation);
        JsonElement visitors = await after.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("Open late", visitors[0].GetProperty("title").GetString());
        Assert.Equal("Book", visitors[0].GetProperty("buttons")[0].GetProperty("label").GetString());
    }

    [Theory]
    [InlineData("""{ "title": "", "startDate": "2026-10-01", "endDate": "2026-10-31" }""", "Title")]
    [InlineData("""{ "title": "x", "startDate": "2026-10-31", "endDate": "2026-10-01" }""", "EndDate")]
    [InlineData("""{ "title": "x", "startDate": "2026-10-01", "endDate": "2026-10-31", "buttons": [{ "label": "Hi", "url": "javascript:alert(1)" }] }""", "Url")]
    [InlineData("""{ "title": "x", "startDate": "2026-10-01", "endDate": "2026-10-31", "buttons": [{ "label": "Hi", "url": "//evil.example" }] }""", "Url")]
    [InlineData("""{ "title": "x", "startDate": "2026-10-01", "endDate": "2026-10-31", "image": { "fileName": "../secret.json", "altText": "x" } }""", "FileName")]
    [InlineData("""{ "title": "x", "startDate": "2026-10-01", "endDate": "2026-10-31", "image": { "fileName": "a.webp", "altText": "" } }""", "AltText")]
    public async Task AnInvalidAnnouncementIs400AndNothingIsSaved(string item, string member)
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.PutAsync("/api/admin/announcements", Json(List(item)), Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.Contains(problem.GetProperty("errors").EnumerateObject(), error => error.Name.Contains(member, StringComparison.OrdinalIgnoreCase));
        Assert.False(storage.ContentFiles.ContainsKey("announcements.json"));
    }

    [Fact]
    public async Task ABodyWithScriptIsStoredWithoutIt()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.PutAsync(
            "/api/admin/announcements",
            Json(List(Item(extra: """, "bodyHtml": "<p>Hi</p><img src=x onerror=alert(1)>" """))),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("onerror", storage.ContentFiles["announcements.json"]);
    }

    [Fact]
    public async Task StorageBeingDownIs503AnnouncementsUnavailable()
    {
        FakeMediaStorage storage = new() { Failure = new IOException("down") };
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage read = await client.GetAsync("/api/admin/announcements", Cancellation);
        using HttpResponseMessage save = await client.PutAsync("/api/admin/announcements", Json(List(Item())), Cancellation);

        await ProblemAssert.IsProblemAsync(read, 503, "announcements_unavailable");
        await ProblemAssert.IsProblemAsync(save, 503, "announcements_unavailable");
    }

    [Fact]
    public async Task AnImageUploadIs201WithItsFileNameAndUrl()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        using MultipartFormDataContent form = ImageForm(ImageBytes.Png, "sale sign.png");

        using HttpResponseMessage response = await client.PostAsync("/api/admin/announcements/images", form, Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        string fileName = body.GetProperty("fileName").GetString()!;
        Assert.StartsWith("sale-sign-", fileName, StringComparison.Ordinal);
        Assert.EndsWith("/announcements/" + fileName, body.GetProperty("src").GetString(), StringComparison.Ordinal);
        Assert.True(storage.MediaFiles.ContainsKey("announcements/" + fileName));
    }

    [Fact]
    public async Task AnImageUploadThatIsNotAnImageIs400AndOnlyAnAdminMayUpload()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        using MultipartFormDataContent script = ImageForm(ImageBytes.Script, "evil.png");
        using MultipartFormDataContent visitorForm = ImageForm(ImageBytes.Png, "a.png");

        using HttpResponseMessage bad = await client.PostAsync("/api/admin/announcements/images", script, Cancellation);
        using HttpResponseMessage visitor = await api.CreateClient().PostAsync("/api/admin/announcements/images", visitorForm, Cancellation);

        await ProblemAssert.IsProblemAsync(bad, 400, "invalid_image");
        Assert.Equal(HttpStatusCode.Forbidden, visitor.StatusCode);
        Assert.Empty(storage.MediaFiles);
    }

    private static MultipartFormDataContent ImageForm(byte[] bytes, string fileName)
    {
        MultipartFormDataContent form = [];
        form.Add(new ByteArrayContent(bytes), "file", fileName);
        return form;
    }
}
