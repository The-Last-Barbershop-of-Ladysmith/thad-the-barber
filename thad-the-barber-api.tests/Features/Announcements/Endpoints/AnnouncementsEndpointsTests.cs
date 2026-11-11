using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Endpoints;

public sealed class AnnouncementsEndpointsTests
{
    private static readonly DateTimeOffset Today = new(2026, 10, 15, 16, 0, 0, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static FakeMediaStorage StorageWith(string file)
    {
        FakeMediaStorage storage = new();
        storage.ContentFiles["announcements.json"] = file;
        return storage;
    }

    [Fact]
    public async Task AnnouncementsReturnsOnlyTheActiveOnesWithTheirImageAndButtons()
    {
        using ApiFactory api = new(
            time: new FakeTimeProvider(Today),
            media: StorageWith("""
                { "items": [
                  { "title": "Showing", "bodyHtml": "<p>Now</p>", "startDate": "2026-10-01", "endDate": "2026-10-31",
                    "image": { "fileName": "now.webp", "altText": "Now", "position": "left" },
                    "buttons": [{ "label": "Book", "url": "/book", "variant": "primary" }] },
                  { "title": "Not yet", "startDate": "2026-11-01", "endDate": "2026-11-30" }
                ] }
                """));

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/announcements", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(1, body.GetArrayLength());
        JsonElement showing = body[0];
        Assert.Equal("Showing", showing.GetProperty("title").GetString());
        Assert.Equal("<p>Now</p>", showing.GetProperty("bodyHtml").GetString());
        Assert.Equal("2026-10-01", showing.GetProperty("startDate").GetString());
        Assert.Equal("2026-10-31", showing.GetProperty("endDate").GetString());
        Assert.Equal("https://fakeaccount.blob.core.windows.net/media-fake/announcements/now.webp", showing.GetProperty("image").GetProperty("src").GetString());
        Assert.Equal("left", showing.GetProperty("image").GetProperty("position").GetString());
        Assert.Equal("primary", showing.GetProperty("buttons")[0].GetProperty("variant").GetString());
    }

    [Fact]
    public async Task AnnouncementsNeedsNoSessionToken()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync("/api/announcements", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AnnouncementsIs200WithNothingWhenStorageCannotBeRead()
    {
        using ApiFactory api = new(media: new FakeMediaStorage
        {
            Failure = new HttpRequestException("Storage is down."),
        });

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/announcements", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(0, body.GetArrayLength());
    }
}
