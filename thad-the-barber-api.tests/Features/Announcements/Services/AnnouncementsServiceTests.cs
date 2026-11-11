using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Features.Announcements.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Services;

public sealed class AnnouncementsServiceTests
{
    private const string NewYork = "America/New_York";
    private const string File = "announcements.json";

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeSquareService _square;
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 15, 16, 0, 0, TimeSpan.Zero));
    private readonly AnnouncementsService _announcements;

    public AnnouncementsServiceTests()
    {
        _square = new FakeSquareService
        {
            ShopDetails = new FakeSquareService().ShopDetails with { TimeZone = NewYork },
        };
        _announcements = new AnnouncementsService(
            _storage,
            FakeStaleCache.Create(_time),
            _square,
            _time,
            Options.Create(FakeMediaStorageSettings.Create()),
            NullLogger<AnnouncementsService>.Instance
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static string Post(string title, string startDate, string endDate) =>
        $$"""{ "title": "{{title}}", "startDate": "{{startDate}}", "endDate": "{{endDate}}" }""";

    private void Publish(params string[] posts) => _storage.ContentFiles[File] = $$"""{ "items": [{{string.Join(",", posts)}}] }""";

    private async Task<List<string>> ActiveTitlesAsync() =>
        (await _announcements.GetActiveAsync(Cancellation)).Select(announcement => announcement.Title).ToList();

    [Fact]
    public async Task AnAnnouncementShowsFromItsFirstDayThroughItsLastOnTheShopsCalendar()
    {
        Publish(
            Post("Ended yesterday", "2026-10-01", "2026-10-14"),
            Post("Today only", "2026-10-15", "2026-10-15"),
            Post("Runs through today", "2026-10-10", "2026-10-15"),
            Post("Starts tomorrow", "2026-10-16", "2026-10-20")
        );

        Assert.Equal(["Today only", "Runs through today"], await ActiveTitlesAsync());
    }

    [Fact]
    public async Task APostThatStartsTomorrowIsNeverInTheResponse()
    {
        Publish(Post("Secret sale", "2026-10-16", "2026-10-20"));

        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task TheDayTurnsOverAtTheShopsMidnightNotUtc()
    {
        Publish(Post("October 16th", "2026-10-16", "2026-10-16"));

        _time.SetUtcNow(new DateTimeOffset(2026, 10, 16, 3, 59, 0, TimeSpan.Zero));
        Assert.Empty(await ActiveTitlesAsync());

        _time.SetUtcNow(new DateTimeOffset(2026, 10, 16, 4, 0, 0, TimeSpan.Zero));
        Assert.Equal(["October 16th"], await ActiveTitlesAsync());

        _time.SetUtcNow(new DateTimeOffset(2026, 10, 17, 3, 59, 0, TimeSpan.Zero));
        Assert.Equal(["October 16th"], await ActiveTitlesAsync());

        _time.SetUtcNow(new DateTimeOffset(2026, 10, 17, 4, 0, 0, TimeSpan.Zero));
        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task TheDayTurnsOverAtTheRightMomentWhenTheClocksFallBack()
    {
        Publish(Post("First of November", "2026-11-01", "2026-11-01"));

        _time.SetUtcNow(new DateTimeOffset(2026, 11, 2, 4, 59, 0, TimeSpan.Zero));
        Assert.Equal(["First of November"], await ActiveTitlesAsync());

        _time.SetUtcNow(new DateTimeOffset(2026, 11, 2, 5, 0, 0, TimeSpan.Zero));
        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task TheDayTurnsOverAtTheRightMomentWhenTheClocksSpringForward()
    {
        Publish(Post("Day after the change", "2027-03-15", "2027-03-15"));

        _time.SetUtcNow(new DateTimeOffset(2027, 3, 15, 3, 59, 0, TimeSpan.Zero));
        Assert.Empty(await ActiveTitlesAsync());

        _time.SetUtcNow(new DateTimeOffset(2027, 3, 15, 4, 0, 0, TimeSpan.Zero));
        Assert.Equal(["Day after the change"], await ActiveTitlesAsync());
    }

    [Fact]
    public async Task AMissingFileHasNoAnnouncements()
    {
        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task AFileThatIsNotJsonHasNoAnnouncements()
    {
        _storage.ContentFiles[File] = "{ not json";

        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task ABrokenEditKeepsServingTheLastGoodCopy()
    {
        Publish(Post("Last good", "2026-10-01", "2026-10-31"));
        await ActiveTitlesAsync();
        _storage.ContentFiles[File] = "{ not json";
        _announcements.MarkStale();

        Assert.Equal(["Last good"], await ActiveTitlesAsync());
    }

    [Fact]
    public async Task AShopClockSquareCannotGiveHasNoAnnouncementsInsteadOfAnError()
    {
        Publish(Post("Showing", "2026-10-01", "2026-10-31"));
        _square.ReadFailure = new HttpRequestException("Square is down.");

        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task StorageThatFailsBeforeAnyCopyExistsHasNoAnnouncements()
    {
        _storage.Failure = new HttpRequestException("Storage is down.");

        Assert.Empty(await ActiveTitlesAsync());
    }

    [Fact]
    public async Task WhenStorageFailsAfterACopyExistsTheLastCopyIsServed()
    {
        Publish(Post("Still up", "2026-10-01", "2026-10-31"));
        await ActiveTitlesAsync();
        _announcements.MarkStale();
        _storage.Failure = new HttpRequestException("Storage is down.");

        Assert.Equal(["Still up"], await ActiveTitlesAsync());
    }

    [Fact]
    public async Task RepeatedLoadsReadTheFileOnce()
    {
        Publish(Post("Cached", "2026-10-01", "2026-10-31"));

        await ActiveTitlesAsync();
        await ActiveTitlesAsync();

        Assert.Equal(1, _storage.Calls);
    }

    [Fact]
    public async Task AMarkedStaleFileIsReadAgainOnTheNextLoad()
    {
        Publish(Post("Before", "2026-10-01", "2026-10-31"));
        await ActiveTitlesAsync();
        Publish(Post("After", "2026-10-01", "2026-10-31"));

        _announcements.MarkStale();

        Assert.Equal(["After"], await ActiveTitlesAsync());
    }

    [Fact]
    public async Task TheCachedItemsAreFilteredAgainWhenTheDayChanges()
    {
        _time.SetUtcNow(new DateTimeOffset(2026, 10, 16, 3, 50, 0, TimeSpan.Zero));
        Publish(Post("Only the 15th", "2026-10-15", "2026-10-15"));
        Assert.Equal(["Only the 15th"], await ActiveTitlesAsync());

        _time.Advance(TimeSpan.FromMinutes(45));

        Assert.Empty(await ActiveTitlesAsync());
        Assert.Equal(1, _storage.Calls);
    }
}
