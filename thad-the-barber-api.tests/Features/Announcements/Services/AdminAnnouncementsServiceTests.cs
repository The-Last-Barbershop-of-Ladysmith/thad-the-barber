using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Features.Announcements.Exceptions;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Features.Announcements.Services;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Services;

public sealed class AdminAnnouncementsServiceTests
{
    private const string File = "announcements.json";

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 15, 16, 0, 0, TimeSpan.Zero));
    private readonly AnnouncementsService _announcements;
    private readonly AdminAnnouncementsService _admin;

    public AdminAnnouncementsServiceTests()
    {
        FakeSquareService square = new()
        {
            ShopDetails = new FakeSquareService().ShopDetails with { TimeZone = "America/New_York" },
        };
        IOptions<MediaStorageSettings> settings = Options.Create(FakeMediaStorageSettings.Create());
        _announcements = new AnnouncementsService(
            _storage,
            FakeStaleCache.Create(_time),
            square,
            _time,
            settings,
            NullLogger<AnnouncementsService>.Instance
        );
        _admin = new AdminAnnouncementsService(_storage, _announcements, settings);
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static AnnouncementInput Input(string title, string startDate, string endDate, string? body = null) =>
        new(title, body, DateOnly.Parse(startDate, CultureInfo.InvariantCulture), DateOnly.Parse(endDate, CultureInfo.InvariantCulture), null, null);

    [Fact]
    public async Task EveryAnnouncementIsListedWithItsStatusOnTheShopsCalendar()
    {
        _storage.ContentFiles[File] = """
            { "items": [
              { "title": "Past", "startDate": "2026-10-01", "endDate": "2026-10-14" },
              { "title": "Now", "startDate": "2026-10-15", "endDate": "2026-10-15",
                "image": { "fileName": "now one.webp", "altText": "A chair", "position": "left" } },
              { "title": "Soon", "startDate": "2026-10-16", "endDate": "2026-10-20" }
            ] }
            """;

        List<AdminAnnouncement> list = await _admin.GetAllAsync(Cancellation);

        Assert.Equal(
            [AdminAnnouncementStatus.Ended, AdminAnnouncementStatus.Showing, AdminAnnouncementStatus.Scheduled],
            list.Select(item => item.Status));
        AdminAnnouncementImage image = list[1].Image!;
        Assert.Equal("now one.webp", image.FileName);
        Assert.Equal("A chair", image.AltText);
        Assert.Equal(AnnouncementImagePosition.Left, image.Position);
        Assert.EndsWith("/announcements/now%20one.webp", image.Src);
    }

    [Fact]
    public async Task AMissingFileIsAnEmptyList()
    {
        Assert.Empty(await _admin.GetAllAsync(Cancellation));
    }

    [Fact]
    public async Task AFileThatIsNotJsonIsUnavailableInsteadOfEmpty()
    {
        _storage.ContentFiles[File] = "not json";

        await Assert.ThrowsAsync<AnnouncementsUnavailableException>(() => _admin.GetAllAsync(Cancellation));
    }

    [Fact]
    public async Task StorageBeingDownIsUnavailableOnReadAndOnSave()
    {
        _storage.Failure = new IOException("down");

        await Assert.ThrowsAsync<AnnouncementsUnavailableException>(() => _admin.GetAllAsync(Cancellation));
        await Assert.ThrowsAsync<AnnouncementsUnavailableException>(() => _admin.SaveAsync([], Cancellation));
    }

    [Fact]
    public async Task SavingStoresACleanedTrimmedFileAndReturnsTheList()
    {
        AnnouncementInput input = new(
            "  Holiday hours  ",
            "<p>Open</p><script>alert(1)</script>",
            new DateOnly(2026, 10, 15),
            new DateOnly(2026, 10, 31),
            new AnnouncementImageInput("hours.webp", "  Hours sign ", AnnouncementImagePosition.Left),
            [new AnnouncementButtonInput(" Book ", " /book ", AnnouncementButtonVariant.Primary)]);

        List<AdminAnnouncement> saved = await _admin.SaveAsync([input], Cancellation);

        JsonElement item = JsonDocument.Parse(_storage.ContentFiles[File]).RootElement.GetProperty("items")[0];
        Assert.Equal("Holiday hours", item.GetProperty("title").GetString());
        Assert.Equal("<p>Open</p>", item.GetProperty("bodyHtml").GetString());
        Assert.Equal("2026-10-15", item.GetProperty("startDate").GetString());
        Assert.Equal("left", item.GetProperty("image").GetProperty("position").GetString());
        Assert.Equal("Hours sign", item.GetProperty("image").GetProperty("altText").GetString());
        Assert.Equal("primary", item.GetProperty("buttons")[0].GetProperty("variant").GetString());
        Assert.Equal("/book", item.GetProperty("buttons")[0].GetProperty("url").GetString());
        AdminAnnouncement result = Assert.Single(saved);
        Assert.Equal("Holiday hours", result.Title);
        Assert.Equal(AdminAnnouncementStatus.Showing, result.Status);
        Assert.Equal("hours.webp", result.Image!.FileName);
    }

    [Fact]
    public async Task ASaveIsVisibleToVisitorsAtOnce()
    {
        _storage.ContentFiles[File] = """{ "items": [{ "title": "Old", "startDate": "2026-10-01", "endDate": "2026-10-31" }] }""";
        Assert.Equal(["Old"], (await _announcements.GetActiveAsync(Cancellation)).Select(item => item.Title));

        await _admin.SaveAsync([Input("New", "2026-10-01", "2026-10-31")], Cancellation);

        Assert.Equal(["New"], (await _announcements.GetActiveAsync(Cancellation)).Select(item => item.Title));
    }

    [Fact]
    public async Task SavingAnEmptyListClearsEveryAnnouncement()
    {
        _storage.ContentFiles[File] = """{ "items": [{ "title": "Old", "startDate": "2026-10-01", "endDate": "2026-10-31" }] }""";

        List<AdminAnnouncement> saved = await _admin.SaveAsync([], Cancellation);

        Assert.Empty(saved);
        Assert.Empty(await _announcements.GetActiveAsync(Cancellation));
    }

    [Fact]
    public async Task AnImageIsStoredInTheAnnouncementsFolderUnderASafeUniqueName()
    {
        AdminAnnouncementImageUpload first = await _admin.UploadImageAsync(ImageBytes.Webp, "../My Holiday Sign!.PNG", Cancellation);
        AdminAnnouncementImageUpload second = await _admin.UploadImageAsync(ImageBytes.Webp, "../My Holiday Sign!.PNG", Cancellation);

        Assert.Matches("^my-holiday-sign-[0-9a-f]{8}\\.webp$", first.FileName);
        Assert.NotEqual(first.FileName, second.FileName);
        Assert.Equal("image/webp", _storage.MediaFiles["announcements/" + first.FileName].ContentType);
        Assert.EndsWith("/announcements/" + first.FileName, first.Src, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnImageWithNoUsableNameIsCalledImage()
    {
        AdminAnnouncementImageUpload image = await _admin.UploadImageAsync(ImageBytes.Jpeg, "!!!.jpg", Cancellation);

        Assert.StartsWith("image-", image.FileName, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", image.FileName, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AFileThatIsNotAnImageIsRefusedAndNothingIsStored()
    {
        await Assert.ThrowsAsync<InvalidImageException>(() => _admin.UploadImageAsync(ImageBytes.Script, "a.jpg", Cancellation));

        Assert.Empty(_storage.MediaFiles);
    }

    [Fact]
    public async Task StorageBeingDownIsUnavailableOnImageUpload()
    {
        _storage.Failure = new IOException("down");

        await Assert.ThrowsAsync<AnnouncementsUnavailableException>(() => _admin.UploadImageAsync(ImageBytes.Jpeg, "a.jpg", Cancellation));
    }
}
