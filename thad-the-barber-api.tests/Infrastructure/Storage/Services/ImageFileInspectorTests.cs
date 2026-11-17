using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Storage.Services;

public sealed class ImageFileInspectorTests
{
    [Fact]
    public void EachAcceptedFormatIsRecognisedFromItsFirstBytes()
    {
        Assert.Equal(new ImageKind(".jpg", "image/jpeg"), ImageFileInspector.Inspect(ImageBytes.Jpeg));
        Assert.Equal(new ImageKind(".png", "image/png"), ImageFileInspector.Inspect(ImageBytes.Png));
        Assert.Equal(new ImageKind(".webp", "image/webp"), ImageFileInspector.Inspect(ImageBytes.Webp));
        Assert.Equal(new ImageKind(".avif", "image/avif"), ImageFileInspector.Inspect(ImageBytes.Avif));
    }

    [Fact]
    public void AScriptOrAnythingElseIsNotAnImage()
    {
        Assert.Null(ImageFileInspector.Inspect(ImageBytes.Script));
        Assert.Null(ImageFileInspector.Inspect([]));
        Assert.Null(ImageFileInspector.Inspect([0xFF, 0xD8]));
        Assert.Null(ImageFileInspector.Inspect("RIFF\0\0\0\0WAVE"u8));
        Assert.Null(ImageFileInspector.Inspect([0, 0, 0, 0x1C, .. "ftypmp42"u8]));
    }

    [Fact]
    public void TheAvifSequenceBrandIsRecognisedToo()
    {
        Assert.Equal(".avif", ImageFileInspector.Inspect([0, 0, 0, 0x1C, .. "ftypavis"u8])?.Extension);
    }
}
