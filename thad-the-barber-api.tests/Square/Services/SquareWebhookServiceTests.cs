using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class SquareWebhookServiceTests : IDisposable
{
    private const string LocationPath = "/v2/locations/main";
    private const string CatalogPath = "/v2/catalog/search-catalog-items";

    private readonly SquareHarness _harness = new SquareHarness().WithShopResponses();

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ALocationUpdateMakesOnlyTheNextShopReadRefetch()
    {
        await ReadShopAndServicesAsync();

        HandleSigned(SquareFixture.ReadText("webhook-location-updated.json"));
        await ReadShopAndServicesAsync();

        Assert.Equal(2, RequestsTo(LocationPath));
        Assert.Equal(1, RequestsTo(CatalogPath));
    }

    [Fact]
    public async Task ACatalogUpdateMakesOnlyTheNextServicesReadRefetch()
    {
        await ReadShopAndServicesAsync();

        HandleSigned(SquareFixture.ReadText("webhook-catalog-version-updated.json"));
        await ReadShopAndServicesAsync();

        Assert.Equal(1, RequestsTo(LocationPath));
        Assert.Equal(2, RequestsTo(CatalogPath));
    }

    [Fact]
    public async Task AnEventTypeWeDontHandleChangesNothing()
    {
        await ReadShopAndServicesAsync();

        HandleSigned(SquareFixture.ReadText("webhook-customer-created.json"));
        await ReadShopAndServicesAsync();

        Assert.Equal(1, RequestsTo(LocationPath));
        Assert.Equal(1, RequestsTo(CatalogPath));
    }

    [Fact]
    public async Task ARepeatedEventIsHandledOnce()
    {
        string body = SquareFixture.ReadText("webhook-location-updated.json");
        await ReadShopAndServicesAsync();
        HandleSigned(body);
        await ReadShopAndServicesAsync();

        HandleSigned(body);
        await ReadShopAndServicesAsync();

        Assert.Equal(2, RequestsTo(LocationPath));
    }

    [Theory]
    [InlineData("wrong key")]
    [InlineData("other URL")]
    [InlineData("tampered body")]
    [InlineData("missing")]
    public async Task ABadSignatureThrowsAndChangesNothing(string kind)
    {
        string body = SquareFixture.ReadText("webhook-location-updated.json");
        await ReadShopAndServicesAsync();

        Assert.Throws<InvalidWebhookSignatureException>(() => _harness.Webhooks.Handle(SentBody(body, kind), Signature(body, kind)));
        await ReadShopAndServicesAsync();

        Assert.Equal(1, RequestsTo(LocationPath));
    }

    public void Dispose() => _harness.Dispose();

    private static string SentBody(string body, string kind)
    {
        if (kind == "tampered body")
        {
            return body.Replace("location.updated", "catalog.version.updated", StringComparison.Ordinal);
        }

        return body;
    }

    private static string? Signature(string body, string kind) =>
        kind switch
        {
            "wrong key" => SquareWebhooks.Sign(body, key: "another-made-up-key"),
            "other URL" => SquareWebhooks.Sign(body, notificationUrl: "https://elsewhere.example.test/api/webhooks/square"),
            "tampered body" => SquareWebhooks.Sign(body),
            "missing" => null,
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "No such bad signature."),
        };

    private void HandleSigned(string body) => _harness.Webhooks.Handle(body, SquareWebhooks.Sign(body));

    private async Task ReadShopAndServicesAsync()
    {
        await _harness.Square.GetShopDetailsAsync(Cancellation);
        await _harness.Square.GetBookableServicesAsync(Cancellation);
    }

    private int RequestsTo(string path) => _harness.Http.Requests.Count(request => request.Path == path);
}
