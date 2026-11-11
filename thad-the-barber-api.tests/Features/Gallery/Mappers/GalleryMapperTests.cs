using ThadTheBarber.Api.Features.Gallery.Mappers;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Mappers;

public sealed class GalleryMapperTests
{
    private static readonly MediaStorageSettings storage = new()
    {
        AccountName = "fakeaccount",
        MediaContainerName = "media-fake",
        ContentContainerName = "content-fake",
    };

    private static StoredBlob Blob(string name, int day) => new(name, new DateTimeOffset(2026, 10, day, 9, 0, 0, TimeSpan.Zero));

    [Fact]
    public void PhotosAreNewestUploadFirst()
    {
        List<GalleryPhoto> photos = new List<StoredBlob>
        {
            Blob("gallery/first.jpg", 1),
            Blob("gallery/third.png", 3),
            Blob("gallery/second.webp", 2),
        }.ToGalleryPhotos(storage);

        Assert.Equal(["Third", "Second", "First"], photos.Select(photo => photo.Alt));
    }

    [Fact]
    public void PhotosUploadedTogetherKeepAStableOrderByName()
    {
        List<GalleryPhoto> photos = new List<StoredBlob>
        {
            Blob("gallery/b.jpg", 1),
            Blob("gallery/a.jpg", 1),
        }.ToGalleryPhotos(storage);

        Assert.Equal(["A", "B"], photos.Select(photo => photo.Alt));
    }

    [Theory]
    [InlineData("gallery/UPPER_case.JPG")]
    [InlineData("gallery/photo.jpeg")]
    [InlineData("gallery/photo.png")]
    [InlineData("gallery/photo.webp")]
    [InlineData("gallery/photo.avif")]
    public void SupportedImagesAreKeptWhateverTheCaseOfTheirExtension(string name)
    {
        List<GalleryPhoto> photos = new List<StoredBlob> { Blob(name, 1) }.ToGalleryPhotos(storage);

        Assert.Single(photos);
    }

    [Theory]
    [InlineData("gallery/phone-photo.heic")]
    [InlineData("gallery/notes.txt")]
    [InlineData("gallery/no-extension")]
    [InlineData("gallery/old/buried.jpg")]
    [InlineData("announcements/elsewhere.jpg")]
    public void UnsupportedFilesSubFoldersAndOtherFoldersAreLeftOut(string name)
    {
        List<GalleryPhoto> photos = new List<StoredBlob> { Blob(name, 1) }.ToGalleryPhotos(storage);

        Assert.Empty(photos);
    }

    [Fact]
    public void AnEmptyFolderHasNoPhotos()
    {
        Assert.Empty(new List<StoredBlob>().ToGalleryPhotos(storage));
    }

    [Fact]
    public void ThePhotoLoadsFromItsExactUrlInTheMediaContainerWithTheNameEscaped()
    {
        GalleryPhoto photo = Assert.Single(new List<StoredBlob> { Blob("gallery/burst fade#1.png", 1) }.ToGalleryPhotos(storage));

        Assert.Equal("https://fakeaccount.blob.core.windows.net/media-fake/gallery/burst%20fade%231.png", photo.Src);
        Assert.Equal(new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero), photo.UploadedAt);
    }

    [Theory]
    [InlineData("skin-fade_beard.jpg", "Skin fade beard")]
    [InlineData("UPPER_case.JPG", "UPPER case")]
    [InlineData("multiple--dashes.png", "Multiple dashes")]
    [InlineData("name.with.dots.jpg", "Name.with.dots")]
    [InlineData("  spaced   out .webp", "Spaced out")]
    [InlineData("-_-.jpg", "")]
    public void AltTextComesFromTheFileName(string fileName, string expected)
    {
        Assert.Equal(expected, GalleryMapper.ToAltText(fileName));
    }
}
