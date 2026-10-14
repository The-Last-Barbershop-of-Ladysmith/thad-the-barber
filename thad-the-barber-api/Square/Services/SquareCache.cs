using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// Keeps what Square returned for <see cref="CacheFor"/>. Entries never expire: when a refresh fails, the last value is
/// served (stale-while-error) and a warning logged, so the shop's details stay up while Square is down; Square is tried
/// again after <see cref="RetryAfter"/> rather than on every request, so an outage doesn't make each request wait for
/// Square's timeout.
/// </summary>
public sealed partial class SquareCache(IMemoryCache cache, TimeProvider time, ILogger<SquareCache> logger)
{
    public static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan RetryAfter = TimeSpan.FromMinutes(1);

    private readonly ConcurrentDictionary<string, long> _staleMarks = new();

    public async Task<T> GetOrRefreshAsync<T>(string key, Func<Task<T>> fetch, CancellationToken cancellationToken)
    {
        cache.TryGetValue(key, out CachedValue<T>? cached);
        if (cached is not null && time.GetUtcNow() < cached.RefreshAt)
        {
            return cached.Value;
        }

        long staleMarksBeforeFetch = _staleMarks.GetValueOrDefault(key);
        try
        {
            T value = await fetch();
            DateTimeOffset fetchedAt = time.GetUtcNow();
            DateTimeOffset refreshAt = fetchedAt + CacheFor;
            if (_staleMarks.GetValueOrDefault(key) != staleMarksBeforeFetch)
            {
                // Marked stale mid-fetch, so the value may predate the change.
                refreshAt = fetchedAt;
            }

            cache.Set(key, new CachedValue<T>(
                value,
                fetchedAt,
                refreshAt
            ));
            return value;
        }
        catch (Exception exception) when (cached is not null && !cancellationToken.IsCancellationRequested)
        {
            LogServingStale(logger, exception, key, cached.FetchedAt);
            cache.Set(key, cached with
            {
                RefreshAt = time.GetUtcNow() + RetryAfter,
            });
            return cached.Value;
        }
    }

    [LoggerMessage(EventName = "SquareServingStale", Level = LogLevel.Warning, Message = "Square failed, so {CacheKey} is served from the copy fetched {FetchedAt}.")]
    private static partial void LogServingStale(ILogger logger, Exception exception, string cacheKey, DateTimeOffset fetchedAt);

    /// <summary>
    /// Makes the next read of <paramref name="key"/> refetch, keeping the value to serve if Square fails then. A fetch
    /// already running stores its value stale too. <typeparamref name="T"/> must be the type the entry was cached as,
    /// or the cached entry isn't marked.
    /// </summary>
    public void MarkStale<T>(string key)
    {
        _staleMarks.AddOrUpdate(key, 1, (_, marks) => marks + 1);
        if (cache.Get(key) is CachedValue<T> cached)
        {
            cache.Set(key, cached with
            {
                RefreshAt = time.GetUtcNow(),
            });
        }
    }
}
