using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Endpoints;

public sealed class GalleryEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GalleryReturnsThePhotosNewestFirstWithTheirUrlsAltTextAndUploadTimes()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        JsonElement newest = body[0];
        Assert.Equal(2, body.GetArrayLength());
        Assert.Equal("https://fakeaccount.blob.core.windows.net/media-fake/gallery/newer-print.webp", newest.GetProperty("src").GetString());
        Assert.Equal("Newer print", newest.GetProperty("alt").GetString());
        Assert.Equal(new DateTimeOffset(2026, 10, 3, 10, 0, 0, TimeSpan.Zero), newest.GetProperty("uploadedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task GalleryNeedsNoSessionToken()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync("/api/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GalleryIs200WithNothingWhenStorageCannotBeRead()
    {
        using ApiFactory api = new(media: new FakeMediaStorage
        {
            Failure = new HttpRequestException("Storage is down."),
        });

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(0, body.GetArrayLength());
    }
}
