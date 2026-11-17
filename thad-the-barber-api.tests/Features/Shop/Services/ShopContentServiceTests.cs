using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Shop.Exceptions;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Features.Shop.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Shop.Services;

public sealed class ShopContentServiceTests
{
    private const string File = "shop-info.json";

    private readonly FakeMediaStorage _storage = new();
    private readonly ShopContentService _content;

    public ShopContentServiceTests()
    {
        FakeTimeProvider time = new(new DateTimeOffset(2026, 10, 15, 16, 0, 0, TimeSpan.Zero));
        _content = new ShopContentService(
            _storage,
            FakeStaleCache.Create(time),
            Options.Create(FakeMediaStorageSettings.Create())
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task WithNoFileTheSquareDescriptionShows()
    {
        ShopNoticeSettings settings = await _content.GetAsync(Cancellation);

        Assert.Equal(ShopNoticeSettings.Default, settings);
        Assert.True(settings.IsNoticeShown);
        Assert.Null(settings.Notice);
    }

    [Fact]
    public async Task TheFileGivesTheOwnersNoticeAndSwitch()
    {
        _storage.ContentFiles[File] = """{ "notice": "  Closed Monday.  ", "isNoticeShown": false }""";

        ShopNoticeSettings settings = await _content.GetAsync(Cancellation);

        Assert.Equal(new ShopNoticeSettings("Closed Monday.", false), settings);
    }

    [Theory]
    [InlineData("""{}""")]
    [InlineData("""{ "notice": "", "isNoticeShown": true }""")]
    [InlineData("""{ "notice": 5, "isNoticeShown": "no" }""")]
    [InlineData("""[1]""")]
    public async Task AnythingMissingOrOfAnotherShapeKeepsTheDefaults(string file)
    {
        _storage.ContentFiles[File] = file;

        Assert.Equal(ShopNoticeSettings.Default, await _content.GetAsync(Cancellation));
    }

    [Fact]
    public async Task AnUnreadableFileServesTheDefaultsForVisitorsButFailsTheAdminRead()
    {
        _storage.ContentFiles[File] = "not json";

        Assert.Equal(ShopNoticeSettings.Default, await _content.GetAsync(Cancellation));
        await Assert.ThrowsAsync<ShopInfoUnavailableException>(() => _content.ReadAsync(Cancellation));
    }

    [Fact]
    public async Task SavingStoresTheTrimmedNoticeAndShowsItAtOnce()
    {
        await _content.GetAsync(Cancellation);

        await _content.SaveAsync(new ShopInfoSaveRequest("  New notice  ", false), Cancellation);

        JsonElement file = JsonDocument.Parse(_storage.ContentFiles[File]).RootElement;
        Assert.Equal("New notice", file.GetProperty("notice").GetString());
        Assert.False(file.GetProperty("isNoticeShown").GetBoolean());
        Assert.Equal(new ShopNoticeSettings("New notice", false), await _content.GetAsync(Cancellation));
    }

    [Fact]
    public async Task ABlankNoticeIsSavedAsNone()
    {
        await _content.SaveAsync(new ShopInfoSaveRequest("   ", true), Cancellation);

        Assert.Equal(new ShopNoticeSettings(null, true), await _content.ReadAsync(Cancellation));
    }

    [Fact]
    public async Task StorageBeingDownIsUnavailableOnSave()
    {
        _storage.Failure = new IOException("down");

        await Assert.ThrowsAsync<ShopInfoUnavailableException>(
            () => _content.SaveAsync(new ShopInfoSaveRequest("x", true), Cancellation));
    }
}
