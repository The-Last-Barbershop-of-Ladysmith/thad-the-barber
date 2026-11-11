using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ThadTheBarber.Api.Features.Media.Endpoints;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Media.Endpoints;

public sealed class MediaWebhookEndpointsTests
{
    private const string Url = "/api/webhooks/media";

    private const string GalleryChanged = """
        [{ "id": "1", "eventType": "Microsoft.Storage.BlobCreated",
           "subject": "/blobServices/default/containers/media-fake/blobs/gallery/new.jpg", "data": {} }]
        """;

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static HttpRequestMessage Delivery(string body, string? key = ApiFactory.MediaWebhookKey)
    {
        HttpRequestMessage request = new(HttpMethod.Post, Url)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        if (key is not null)
        {
            request.Headers.Add(MediaWebhookEndpoints.KeyHeader, key);
        }

        return request;
    }

    [Fact]
    public async Task TheSubscriptionHandshakeEchoesItsCodeWithoutASessionToken()
    {
        using ApiFactory api = new();
        using HttpRequestMessage request = Delivery("""
            [{ "id": "1", "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent", "data": { "validationCode": "code-123" } }]
            """);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("code-123", body.GetProperty("validationResponse").GetString());
    }

    [Fact]
    public async Task AChangeInTheGalleryFolderShowsOnTheNextGalleryRequest()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = api.CreateClient();
        await client.GetAsync("/api/gallery", Cancellation);
        Assert.Equal(1, storage.Calls);

        using HttpRequestMessage request = Delivery(GalleryChanged);
        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(request, Cancellation);
        await client.GetAsync("/api/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, storage.Calls);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("wrong-key")]
    public async Task ACallWithoutTheRightKeyIs401AndTheCacheIsUntouched(string? key)
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = api.CreateClient();
        await client.GetAsync("/api/gallery", Cancellation);
        using HttpRequestMessage request = Delivery(GalleryChanged, key);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(request, Cancellation);
        await client.GetAsync("/api/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(1, storage.Calls);
    }

    [Fact]
    public async Task ABodyThatIsNotAnArrayOfEventsIs400()
    {
        using ApiFactory api = new();
        using HttpRequestMessage request = Delivery("{ not json");

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ABodyOverTheCapIs413()
    {
        using ApiFactory api = new();
        using HttpRequestMessage request = Delivery(new string('x', MediaWebhookEndpoints.MaxBodyLength + 1));

        using HttpResponseMessage response = await api.CreateClientWithoutToken().SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }
}
