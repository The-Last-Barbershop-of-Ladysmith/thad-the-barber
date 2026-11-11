using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Announcements.Services;
using ThadTheBarber.Api.Features.Gallery.Services;
using ThadTheBarber.Api.Features.Media.Configuration;
using ThadTheBarber.Api.Features.Media.Exceptions;
using ThadTheBarber.Api.Features.Media.Services;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Media.Services;

public sealed class MediaWebhookServiceTests
{
    private const string Key = "made-up-subscription-key";
    private const string Created = "Microsoft.Storage.BlobCreated";
    private const string Deleted = "Microsoft.Storage.BlobDeleted";

    private readonly FakeMediaStorage _storage = new();
    private readonly GalleryService _gallery;
    private readonly AnnouncementsService _announcements;
    private readonly MediaWebhookService _webhooks;

    public MediaWebhookServiceTests()
    {
        FakeTimeProvider time = new(new DateTimeOffset(2026, 10, 15, 16, 0, 0, TimeSpan.Zero));
        IOptions<MediaStorageSettings> storageSettings = Options.Create(new MediaStorageSettings
        {
            AccountName = "fakeaccount",
            MediaContainerName = "media-fake",
            ContentContainerName = "content-fake",
        });
        StaleCache cache = new(new MemoryCache(new MemoryCacheOptions()), time, NullLogger<StaleCache>.Instance);
        _gallery = new GalleryService(_storage, cache, storageSettings);
        _announcements = new AnnouncementsService(_storage, cache, new FakeSquareService(), time, storageSettings, NullLogger<AnnouncementsService>.Instance);
        _webhooks = new MediaWebhookService(
            _gallery,
            _announcements,
            storageSettings,
            Options.Create(new MediaWebhookSettings { Key = Key }),
            NullLogger<MediaWebhookService>.Instance
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static string Event(string eventType, string subject) =>
        $$"""{ "id": "1", "eventType": "{{eventType}}", "subject": "{{subject}}", "data": {} }""";

    private static string Batch(params string[] events) => $"[{string.Join(",", events)}]";

    private static string GallerySubject(string blob) => $"/blobServices/default/containers/media-fake/blobs/{blob}";

    /// <summary>Loads both caches once, so a later call to storage means the webhook marked one stale.</summary>
    private async Task WarmCachesAsync()
    {
        _storage.ContentFiles["announcements.json"] = """{ "items": [] }""";
        await _gallery.GetAsync(Cancellation);
        await _announcements.GetActiveAsync(Cancellation);
        _storage.Calls = 0;
    }

    [Fact]
    public async Task APhotoAddedToTheGalleryFolderMakesTheNextGalleryLoadListItAgain()
    {
        await WarmCachesAsync();

        _webhooks.Handle(Batch(Event(Created, GallerySubject("gallery/new.jpg"))), Key);
        await _gallery.GetAsync(Cancellation);

        Assert.Equal(1, _storage.Calls);
    }

    [Fact]
    public async Task APhotoDeletedFromTheGalleryFolderMakesTheNextGalleryLoadListItAgain()
    {
        await WarmCachesAsync();

        _webhooks.Handle(Batch(Event(Deleted, GallerySubject("gallery/old.jpg"))), Key);
        await _gallery.GetAsync(Cancellation);

        Assert.Equal(1, _storage.Calls);
    }

    [Fact]
    public async Task AChangeToTheAnnouncementsFileMakesTheNextAnnouncementsLoadReadItAgain()
    {
        await WarmCachesAsync();

        _webhooks.Handle(Batch(Event(Created, "/blobServices/default/containers/content-fake/blobs/announcements.json")), Key);
        await _announcements.GetActiveAsync(Cancellation);

        Assert.Equal(1, _storage.Calls);
    }

    [Theory]
    [InlineData(Created, "/blobServices/default/containers/media-fake/blobs/announcements/spring.webp")]
    [InlineData(Created, "/blobServices/default/containers/media-fake/blobs/content/other.json")]
    [InlineData(Created, "/blobServices/default/containers/content-fake/blobs/notes.txt")]
    [InlineData(Created, "/blobServices/default/containers/content-fake/blobs/gallery/new.jpg")]
    [InlineData(Created, "/blobServices/default/containers/other-container/blobs/gallery/new.jpg")]
    [InlineData(Created, "/blobServices/default/containers/media-fake")]
    [InlineData(Created, "/somewhere/else")]
    [InlineData("Microsoft.Storage.BlobTierChanged", "/blobServices/default/containers/media-fake/blobs/gallery/new.jpg")]
    public async Task AChangeToAnythingElseLeavesBothCachesAlone(string eventType, string subject)
    {
        await WarmCachesAsync();

        _webhooks.Handle(Batch(Event(eventType, subject)), Key);
        await _gallery.GetAsync(Cancellation);
        await _announcements.GetActiveAsync(Cancellation);

        Assert.Equal(0, _storage.Calls);
    }

    [Fact]
    public async Task EveryEventInABatchIsHandled()
    {
        await WarmCachesAsync();

        _webhooks.Handle(
            Batch(
                Event(Created, GallerySubject("gallery/new.jpg")),
                Event(Created, "/blobServices/default/containers/content-fake/blobs/announcements.json")
            ),
            Key);
        await _gallery.GetAsync(Cancellation);
        await _announcements.GetActiveAsync(Cancellation);

        Assert.Equal(2, _storage.Calls);
    }

    [Fact]
    public void TheSubscriptionHandshakeEchoesItsValidationCode()
    {
        string handshake = """
            [{ "id": "2", "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent",
               "data": { "validationCode": "code-123", "validationUrl": "https://example.test/validate" } }]
            """;

        Assert.Equal("code-123", _webhooks.Handle(handshake, Key));
    }

    [Fact]
    public void TheSubscriptionHandshakeIsEchoedWithoutTheKey()
    {
        string handshake = """
            [{ "id": "2", "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent",
               "data": { "validationCode": "code-123" } }]
            """;

        Assert.Equal("code-123", _webhooks.Handle(handshake, null));
    }

    [Fact]
    public async Task AHandshakeBatchCarryingABlobEventWithoutTheKeyChangesNothing()
    {
        await WarmCachesAsync();
        string body = Batch(
            Event(Created, GallerySubject("gallery/new.jpg")),
            """{ "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent", "data": { "validationCode": "code-123" } }""");

        _webhooks.Handle(body, null);
        await _gallery.GetAsync(Cancellation);

        Assert.Equal(0, _storage.Calls);
    }

    [Theory]
    [InlineData("{ not json")]
    [InlineData("\"text\"")]
    public void ABadBodyWithoutTheKeyIsRefusedForItsKey(string body)
    {
        Assert.Throws<InvalidMediaWebhookKeyException>(() => _webhooks.Handle(body, null));
    }

    [Fact]
    public void ANotificationHasNothingToEcho()
    {
        Assert.Null(_webhooks.Handle(Batch(Event(Created, GallerySubject("gallery/new.jpg"))), Key));
    }

    [Theory]
    [InlineData("""[{ "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent" }]""")]
    [InlineData("""[{ "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent", "data": "text" }]""")]
    [InlineData("""[{ "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent", "data": { "validationCode": 5 } }]""")]
    [InlineData("""[42, "text", null]""")]
    [InlineData("[]")]
    public void AnEventWithoutAUsableValidationCodeHasNothingToEcho(string body)
    {
        Assert.Null(_webhooks.Handle(body, Key));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("wrong-key")]
    [InlineData("made-up-subscription-key ")]
    public async Task ACallWithoutTheRightKeyIsRefusedAndChangesNothing(string? key)
    {
        await WarmCachesAsync();

        Assert.Throws<InvalidMediaWebhookKeyException>(() =>
            _webhooks.Handle(Batch(Event(Created, GallerySubject("gallery/new.jpg"))), key));
        await _gallery.GetAsync(Cancellation);

        Assert.Equal(0, _storage.Calls);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void WithNoKeyConfiguredEveryCallIsRefused(string? configuredKey)
    {
        MediaWebhookService unconfigured = new(
            _gallery,
            _announcements,
            Options.Create(new MediaStorageSettings { AccountName = "a", MediaContainerName = "m", ContentContainerName = "c" }),
            Options.Create(new MediaWebhookSettings { Key = configuredKey }),
            NullLogger<MediaWebhookService>.Instance
        );

        Assert.Throws<InvalidMediaWebhookKeyException>(() => unconfigured.Handle("[]", configuredKey));
    }

    [Theory]
    [InlineData("{ not json")]
    [InlineData("""{ "eventType": "Microsoft.Storage.BlobCreated" }""")]
    [InlineData("\"text\"")]
    [InlineData("")]
    public void ABodyThatIsNotAnArrayOfEventsIsRefused(string body)
    {
        Assert.Throws<InvalidMediaWebhookBodyException>(() => _webhooks.Handle(body, Key));
    }
}
