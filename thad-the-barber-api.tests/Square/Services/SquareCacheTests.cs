using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class SquareCacheTests
{
    private const string Key = "square:test";

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 4, 12, 0, 0, TimeSpan.Zero));
    private readonly FakeLogger<SquareCache> _logger = new();
    private readonly SquareCache _cache;
    private Exception? _fetchFailure;
    private int _fetches;

    public SquareCacheTests()
    {
        _cache = new SquareCache(
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
        _time.Advance(SquareCache.CacheFor - TimeSpan.FromSeconds(1));

        await ReadAsync(Key);

        Assert.Equal(1, _fetches);
    }

    [Fact]
    public async Task AReadAfterTheHourFetchesAgain()
    {
        await ReadAsync(Key);
        _time.Advance(SquareCache.CacheFor);

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
        _time.Advance(SquareCache.CacheFor);
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
        _time.Advance(SquareCache.CacheFor);
        _fetchFailure = new HttpRequestException("Square is down.");
        await ReadAsync(Key);

        _time.Advance(SquareCache.RetryAfter - TimeSpan.FromSeconds(1));
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
        _time.Advance(SquareCache.CacheFor);
        _fetchFailure = new TaskCanceledException();
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();

        await Assert.ThrowsAsync<TaskCanceledException>(() => _cache.GetOrRefreshAsync(Key, FetchAsync, cancelled.Token));
    }

    private Task<int> ReadAsync(string key) => _cache.GetOrRefreshAsync(key, FetchAsync, Cancellation);

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
