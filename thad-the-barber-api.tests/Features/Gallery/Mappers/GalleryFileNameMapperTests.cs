using ThadTheBarber.Api.Features.Gallery.Mappers;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Mappers;

public sealed class GalleryFileNameMapperTests
{
    [Theory]
    [InlineData("Skin fade beard", "skin-fade-beard")]
    [InlineData("  Skin   fade, beard!  ", "skin-fade-beard")]
    [InlineData("Café crème", "cafe-creme")]
    [InlineData("---", "")]
    [InlineData("", "")]
    public void AltTextBecomesALowerCaseHyphenatedStem(string altText, string expected)
    {
        Assert.Equal(expected, GalleryFileNameMapper.ToStem(altText));
    }

    [Fact]
    public void TheStemMakesTheSameAltTextThePublicListShows()
    {
        string fileName = GalleryFileNameMapper.ToStem("Skin fade beard") + ".jpg";

        Assert.Equal("Skin fade beard", GalleryMapper.ToAltText(fileName));
    }

    [Fact]
    public void ANameThatIsTakenGetsTheNextNumber()
    {
        HashSet<string> taken = ["fade.jpg", "fade-2.jpg"];

        Assert.Equal("fade-3.jpg", GalleryFileNameMapper.ToUniqueName("fade", ".jpg", taken.Contains));
        Assert.Equal("other.jpg", GalleryFileNameMapper.ToUniqueName("other", ".jpg", taken.Contains));
    }

    [Theory]
    [InlineData("skin-fade.jpg", true)]
    [InlineData("A1.PNG", true)]
    [InlineData("older_print.jpg", true)]
    [InlineData("../secret.jpg", false)]
    [InlineData("folder/a.jpg", false)]
    [InlineData("a.gif", false)]
    [InlineData("skin fade_beard.jpg", true)]
    [InlineData("a;b.jpg", false)]
    [InlineData("-a.jpg", false)]
    [InlineData("", false)]
    public void OnlyAPlainStoredFileNameIsSafeToDelete(string fileName, bool expected)
    {
        Assert.Equal(expected, GalleryFileNameMapper.IsSafeFileName(fileName));
    }
}
