using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Features.Gallery.Exceptions;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Features.Gallery.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Services;

public sealed class AdminGalleryServiceTests
{
    private readonly FakeMediaStorage _storage = new();
    private readonly GalleryService _gallery;
    private readonly AdminGalleryService _admin;

    public AdminGalleryServiceTests()
    {
        FakeTimeProvider time = new(new DateTimeOffset(2026, 10, 15, 16, 0, 0, TimeSpan.Zero));
        IOptions<ThadTheBarber.Api.Infrastructure.Storage.Configuration.MediaStorageSettings> settings =
            Options.Create(FakeMediaStorageSettings.Create());
        _gallery = new GalleryService(_storage, FakeStaleCache.Create(time), settings);
        _admin = new AdminGalleryService(_storage, _gallery, settings);
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task EveryPhotoIsListedWithItsFileNameAndAltText()
    {
        List<AdminGalleryPhoto> photos = await _admin.GetAllAsync(Cancellation);

        Assert.Equal(["newer-print.webp", "older_print.jpg"], photos.Select(photo => photo.FileName));
        Assert.Equal("Newer print", photos[0].AltText);
        Assert.EndsWith("/gallery/newer-print.webp", photos[0].Src, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnUploadIsNamedFromItsAltTextAndStoredWithItsRealContentType()
    {
        AdminGalleryPhoto photo = await _admin.UploadAsync(ImageBytes.Png, "Skin fade, beard!", Cancellation);

        Assert.Equal("skin-fade-beard.png", photo.FileName);
        Assert.Equal("Skin fade beard", photo.AltText);
        Assert.Equal("image/png", _storage.MediaFiles["gallery/skin-fade-beard.png"].ContentType);
    }

    [Fact]
    public async Task ASecondPhotoWithTheSameWordsGetsANumber()
    {
        await _admin.UploadAsync(ImageBytes.Jpeg, "Fade", Cancellation);

        AdminGalleryPhoto second = await _admin.UploadAsync(ImageBytes.Jpeg, "Fade", Cancellation);

        Assert.Equal("fade-2.jpg", second.FileName);
    }

    [Fact]
    public async Task AnUploadShowsOnThePublicGalleryAtOnce()
    {
        await _gallery.GetAsync(Cancellation);

        await _admin.UploadAsync(ImageBytes.Webp, "New cut", Cancellation);

        Assert.Contains((await _gallery.GetAsync(Cancellation)), photo => photo.Alt == "New cut");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("!!!")]
    public async Task AnUploadWithoutWordsToDescribeItIsRefused(string? altText)
    {
        await Assert.ThrowsAsync<InvalidImageException>(() => _admin.UploadAsync(ImageBytes.Jpeg, altText, Cancellation));
    }

    [Fact]
    public async Task AnAltTextOverTheLimitIsRefused()
    {
        await Assert.ThrowsAsync<InvalidImageException>(
            () => _admin.UploadAsync(ImageBytes.Jpeg, new string('a', 101), Cancellation));
    }

    [Fact]
    public async Task AFileThatIsNotAnImageOrIsTooBigIsRefusedAndNothingIsStored()
    {
        await Assert.ThrowsAsync<InvalidImageException>(() => _admin.UploadAsync(ImageBytes.Script, "Fade", Cancellation));
        await Assert.ThrowsAsync<InvalidImageException>(() => _admin.UploadAsync([], "Fade", Cancellation));
        byte[] huge = new byte[(8 * 1024 * 1024) + 1];
        ImageBytes.Jpeg.CopyTo(huge, 0);
        await Assert.ThrowsAsync<InvalidImageException>(() => _admin.UploadAsync(huge, "Fade", Cancellation));

        Assert.Empty(_storage.MediaFiles);
    }

    [Fact]
    public async Task DeletingRemovesThePhotoFromBothLists()
    {
        await _gallery.GetAsync(Cancellation);

        await _admin.DeleteAsync("older_print.jpg", Cancellation);

        Assert.DoesNotContain((await _admin.GetAllAsync(Cancellation)), photo => photo.FileName == "older_print.jpg");
        Assert.DoesNotContain((await _gallery.GetAsync(Cancellation)), photo => photo.Alt == "Older print");
    }

    [Theory]
    [InlineData("missing.jpg")]
    [InlineData("../content.json")]
    [InlineData("a/b.jpg")]
    public async Task DeletingAPhotoThatIsNotThereIsNotFound(string fileName)
    {
        await Assert.ThrowsAsync<PhotoNotFoundException>(() => _admin.DeleteAsync(fileName, Cancellation));
    }

    [Fact]
    public async Task StorageBeingDownIsUnavailableForEveryCall()
    {
        _storage.Failure = new IOException("down");

        await Assert.ThrowsAsync<GalleryUnavailableException>(() => _admin.GetAllAsync(Cancellation));
        await Assert.ThrowsAsync<GalleryUnavailableException>(() => _admin.UploadAsync(ImageBytes.Jpeg, "Fade", Cancellation));
        await Assert.ThrowsAsync<GalleryUnavailableException>(() => _admin.DeleteAsync("older_print.jpg", Cancellation));
    }
}
