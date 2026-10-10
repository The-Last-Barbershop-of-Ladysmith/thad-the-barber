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

    public async Task<T> GetOrRefreshAsync<T>(string key, Func<Task<T>> fetch, CancellationToken cancellationToken)
    {
        cache.TryGetValue(key, out CachedValue<T>? cached);
        if (cached is not null && time.GetUtcNow() < cached.RefreshAt)
        {
            return cached.Value;
        }

        try
        {
            T value = await fetch();
            DateTimeOffset fetchedAt = time.GetUtcNow();
            cache.Set(key, new CachedValue<T>(
                value,
                fetchedAt,
                fetchedAt + CacheFor
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
}
