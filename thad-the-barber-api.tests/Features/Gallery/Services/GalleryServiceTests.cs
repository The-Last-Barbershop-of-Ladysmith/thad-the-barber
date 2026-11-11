using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Features.Gallery.Services;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Services;

public sealed class GalleryServiceTests
{
    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new();
    private readonly GalleryService _gallery;

    public GalleryServiceTests()
    {
        _gallery = new GalleryService(
            _storage,
            FakeStaleCache.Create(_time),
            Options.Create(FakeMediaStorageSettings.Create())
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ListsThePhotosNewestFirst()
    {
        List<GalleryPhoto> photos = await _gallery.GetAsync(Cancellation);

        Assert.Equal(["Newer print", "Older print"], photos.Select(photo => photo.Alt));
    }

    [Fact]
    public async Task RepeatedLoadsComeFromTheCacheWithoutCallingStorage()
    {
        await _gallery.GetAsync(Cancellation);
        await _gallery.GetAsync(Cancellation);

        Assert.Equal(1, _storage.Calls);
    }

    [Fact]
    public async Task AMarkedStaleGalleryIsListedAgainOnTheNextLoad()
    {
        await _gallery.GetAsync(Cancellation);
        _storage.GalleryBlobs.Add(new StoredBlob("gallery/newest.png", new DateTimeOffset(2026, 10, 5, 10, 0, 0, TimeSpan.Zero)));

        _gallery.MarkStale();
        List<GalleryPhoto> photos = await _gallery.GetAsync(Cancellation);

        Assert.Equal(2, _storage.Calls);
        Assert.Equal("Newest", photos[0].Alt);
    }

    [Fact]
    public async Task WhenStorageFailsAfterACopyExistsTheLastCopyIsServed()
    {
        await _gallery.GetAsync(Cancellation);
        _gallery.MarkStale();
        _storage.Failure = new HttpRequestException("Storage is down.");

        List<GalleryPhoto> photos = await _gallery.GetAsync(Cancellation);

        Assert.Equal(2, photos.Count);
    }

    [Fact]
    public async Task WhenStorageFailsBeforeAnyCopyExistsThereAreNoPhotos()
    {
        _storage.Failure = new HttpRequestException("Storage is down.");

        List<GalleryPhoto> photos = await _gallery.GetAsync(Cancellation);

        Assert.Empty(photos);
    }
}
