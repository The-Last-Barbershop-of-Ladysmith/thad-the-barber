using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Shop.Endpoints;

public sealed class AdminShopEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static HttpClient AdminClient(ApiFactory api)
    {
        HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key));
        return client;
    }

    private static StringContent Json(string body) => new(body, System.Text.Encoding.UTF8, "application/json");

    [Fact]
    public async Task OnlyAnAdminSessionCanReadOrSave()
    {
        using ApiFactory api = new();

        using HttpResponseMessage visitorRead = await api.CreateClient().GetAsync("/api/admin/shop", Cancellation);
        using HttpResponseMessage visitorSave = await api.CreateClient().PutAsync(
            "/api/admin/shop",
            Json("""{ "notice": "x", "isNoticeShown": true }"""),
            Cancellation);
        using HttpResponseMessage anonymous = await api.CreateClientWithoutToken().GetAsync("/api/admin/shop", Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, visitorRead.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorSave.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task TheAdminSeesWhatIsSavedAndSquaresDescription()
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.GetAsync("/api/admin/shop", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("notice").ValueKind);
        Assert.True(body.GetProperty("isNoticeShown").GetBoolean());
        Assert.StartsWith("❗Important", body.GetProperty("squareNotice").GetString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SavingChangesTheNoticeOnTheBookingPageAtOnce()
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage saved = await client.PutAsync(
            "/api/admin/shop",
            Json("""{ "notice": "Closed Monday.", "isNoticeShown": true }"""),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        JsonElement body = await saved.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("Closed Monday.", body.GetProperty("notice").GetString());
        JsonElement shop = await api.CreateClient().GetFromJsonAsync<JsonElement>("/api/shop", Cancellation);
        Assert.Equal("Closed Monday.", shop.GetProperty("notice").GetString());
    }

    [Fact]
    public async Task TurningTheNoticeOffHidesItFromTheBookingPage()
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage saved = await client.PutAsync(
            "/api/admin/shop",
            Json("""{ "notice": null, "isNoticeShown": false }"""),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        JsonElement shop = await api.CreateClient().GetFromJsonAsync<JsonElement>("/api/shop", Cancellation);
        Assert.Equal(JsonValueKind.Null, shop.GetProperty("notice").ValueKind);
    }

    [Theory]
    [InlineData("""{ "notice": "x" }""")]
    [InlineData("""{}""")]
    public async Task ASaveWithoutTheSwitchIsABadRequest(string body)
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.PutAsync("/api/admin/shop", Json(body), Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "bad_request");
    }

    [Fact]
    public async Task ANoticeOverTheLimitIs400AndNothingIsSaved()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        string notice = new('x', 1001);

        using HttpResponseMessage response = await client.PutAsync(
            "/api/admin/shop",
            Json($$"""{ "notice": "{{notice}}", "isNoticeShown": true }"""),
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.False(storage.ContentFiles.ContainsKey("shop-info.json"));
    }

    [Fact]
    public async Task StorageBeingDownIs503ShopInfoUnavailable()
    {
        FakeMediaStorage storage = new() { Failure = new IOException("down") };
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage read = await client.GetAsync("/api/admin/shop", Cancellation);
        using HttpResponseMessage save = await client.PutAsync(
            "/api/admin/shop",
            Json("""{ "notice": "x", "isNoticeShown": true }"""),
            Cancellation);

        await ProblemAssert.IsProblemAsync(read, 503, "shop_info_unavailable");
        await ProblemAssert.IsProblemAsync(save, 503, "shop_info_unavailable");
    }
}
