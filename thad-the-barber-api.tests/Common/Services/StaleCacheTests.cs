using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Services;

namespace ThadTheBarber.Api.Tests.Common.Services;

public sealed class StaleCacheTests
{
    private const string Key = "square:test";

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 4, 12, 0, 0, TimeSpan.Zero));
    private readonly FakeLogger<StaleCache> _logger = new();
    private readonly StaleCache _cache;
    private Exception? _fetchFailure;
    private int _fetches;

    public StaleCacheTests()
    {
        _cache = new StaleCache(
            new MemoryCache(new MemoryCacheOptions()),
            _time,
            _logger
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASecondReadWithinTheHourIsServedFromTheCache()
    {
        await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor - TimeSpan.FromSeconds(1));

        await ReadAsync(Key);

        Assert.Equal(1, _fetches);
    }

    [Fact]
    public async Task AReadAfterTheHourFetchesAgain()
    {
        await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor);

        int value = await ReadAsync(Key);

        Assert.Equal(2, value);
    }

    [Fact]
    public async Task EachKeyIsCachedOnItsOwn()
    {
        await ReadAsync("square:test:a");
        await ReadAsync("square:test:b");

        Assert.Equal(2, _fetches);
    }

    [Fact]
    public async Task WhenAFetchFailsTheLastCopyIsServedAndAWarningLogged()
    {
        int fetched = await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor);
        _fetchFailure = new HttpRequestException("Square is down.");

        int served = await ReadAsync(Key);

        Assert.Equal(fetched, served);
        Assert.Equal(2, _fetches);
        Assert.Equal(LogLevel.Warning, _logger.LatestRecord.Level);
        Assert.Same(_fetchFailure, _logger.LatestRecord.Exception);
    }

    [Fact]
    public async Task WhileFetchesFailTheyAreRetriedOnlyAfterTheRetryWait()
    {
        await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor);
        _fetchFailure = new HttpRequestException("Square is down.");
        await ReadAsync(Key);

        _time.Advance(StaleCache.RetryAfter - TimeSpan.FromSeconds(1));
        await ReadAsync(Key);
        Assert.Equal(2, _fetches);

        _time.Advance(TimeSpan.FromSeconds(1));
        await ReadAsync(Key);
        Assert.Equal(3, _fetches);
    }

    [Fact]
    public async Task WhenAFetchFailsWithNothingCachedTheCallerGetsTheFailure()
    {
        _fetchFailure = new HttpRequestException("Square is down.");

        await Assert.ThrowsAsync<HttpRequestException>(() => ReadAsync(Key));
    }

    [Fact]
    public async Task ACancelledReadIsntAnsweredWithTheLastCopy()
    {
        await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor);
        _fetchFailure = new TaskCanceledException();
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();

        await Assert.ThrowsAsync<TaskCanceledException>(() => _cache.GetOrRefreshAsync(Key, FetchAsync, cancelled.Token));
    }

    [Fact]
    public async Task AReadAfterMarkStaleFetchesAgain()
    {
        await ReadAsync(Key);

        _cache.MarkStale<int>(Key);
        int value = await ReadAsync(Key);

        Assert.Equal(2, value);
    }

    [Fact]
    public async Task WhenAFetchFailsAfterMarkStaleTheLastCopyIsServed()
    {
        int fetched = await ReadAsync(Key);
        _cache.MarkStale<int>(Key);
        _fetchFailure = new HttpRequestException("Square is down.");

        int served = await ReadAsync(Key);

        Assert.Equal(fetched, served);
        Assert.Equal(2, _fetches);
    }

    [Fact]
    public async Task MarkStaleOnlyMarksItsOwnKey()
    {
        await ReadAsync("square:test:a");
        await ReadAsync("square:test:b");

        _cache.MarkStale<int>("square:test:a");
        await ReadAsync("square:test:b");

        Assert.Equal(2, _fetches);
    }

    [Fact]
    public async Task AFetchRunningWhenMarkedStaleIsStoredStale()
    {
        await ReadAsync(Key);
        _time.Advance(StaleCache.CacheFor);
        await _cache.GetOrRefreshAsync(Key, FetchThenMarkStaleAsync, Cancellation);

        int value = await ReadAsync(Key);

        Assert.Equal(3, value);
    }

    [Fact]
    public async Task AFirstFetchRunningWhenMarkedStaleIsStoredStale()
    {
        await _cache.GetOrRefreshAsync(Key, FetchThenMarkStaleAsync, Cancellation);

        int value = await ReadAsync(Key);

        Assert.Equal(2, value);
    }

    [Fact]
    public async Task MarkStaleOnANewKeyCachesNothing()
    {
        _cache.MarkStale<int>(Key);

        int value = await ReadAsync(Key);

        Assert.Equal(1, value);
    }

    [Fact]
    public async Task AFailedFirstReadServesTheFallbackAndIsNotRetriedBeforeTheRetryTime()
    {
        _fetchFailure = new HttpRequestException("Storage is down.");

        int first = await _cache.GetOrRefreshAsync(Key, FetchAsync, -1, Cancellation);
        _time.Advance(StaleCache.RetryAfter - TimeSpan.FromSeconds(1));
        int second = await _cache.GetOrRefreshAsync(Key, FetchAsync, -1, Cancellation);

        Assert.Equal([-1, -1, 1], [first, second, _fetches]);
    }

    private Task<int> ReadAsync(string key) => _cache.GetOrRefreshAsync(key, FetchAsync, Cancellation);

    /// <summary>A fetch that sees a change land while Square is answering it.</summary>
    private Task<int> FetchThenMarkStaleAsync()
    {
        Task<int> fetched = FetchAsync();
        _cache.MarkStale<int>(Key);
        return fetched;
    }

    private Task<int> FetchAsync()
    {
        _fetches++;
        if (_fetchFailure is not null)
        {
            return Task.FromException<int>(_fetchFailure);
        }

        return Task.FromResult(_fetches);
    }
}
