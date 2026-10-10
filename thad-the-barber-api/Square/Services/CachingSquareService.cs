using Microsoft.Extensions.Caching.Memory;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// Caches the shop's details, booking profile and bookable services for <see cref="CacheFor"/>. Entries never expire:
/// when a refresh fails, the last value is served (stale-while-error) and a warning logged, so the shop's details stay
/// up while Square is down; Square is tried again after <see cref="RetryAfter"/> rather than on every request, so an
/// outage doesn't make each request wait for Square's timeout. Availability and booking calls always reach Square.
/// </summary>
public sealed partial class CachingSquareService(
    [FromKeyedServices(SquareSetup.UncachedServiceKey)] ISquareService square,
    IMemoryCache cache,
    TimeProvider time,
    ILogger<CachingSquareService> logger) : ISquareService
{
    public static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(60);
    public static readonly TimeSpan RetryAfter = TimeSpan.FromMinutes(1);
    private const string ShopDetailsKey = "square:shop-details";
    private const string BookingProfileKeyPrefix = "square:booking-profile:";
    private const string BookableServicesKey = "square:bookable-services";

    public Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken) =>
        square.CheckConnectionAsync(cancellationToken);

    public Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken) =>
        GetOrRefreshAsync(ShopDetailsKey, () => square.GetShopDetailsAsync(cancellationToken), cancellationToken);

    public Task<BookingProfile> GetBookingProfileAsync(string locationId, CancellationToken cancellationToken) =>
        GetOrRefreshAsync(
            BookingProfileKeyPrefix + locationId,
            () => square.GetBookingProfileAsync(locationId, cancellationToken),
            cancellationToken);

    public Task<List<BookableService>> GetBookableServicesAsync(CancellationToken cancellationToken) =>
        GetOrRefreshAsync(BookableServicesKey, () => square.GetBookableServicesAsync(cancellationToken), cancellationToken);

    public Task<List<TimeSlot>> SearchAvailableTimeSlotsAsync(string locationId, BookableService bookableService, DateTimeRange dateTimeRange, CancellationToken cancellationToken) =>
        square.SearchAvailableTimeSlotsAsync(locationId, bookableService, dateTimeRange, cancellationToken);

    public Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken) =>
        square.FindCustomerIdAsync(phone, cancellationToken);

    public Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken) =>
        square.CreateCustomerAsync(name, phone, idempotencyKey, cancellationToken);

    public Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken) =>
        square.CreateBookingAsync(customerId, timeSlot, idempotencyKey, cancellationToken);

    public Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken) =>
        square.CancelBookingAsync(bookingId, bookingVersion, cancellationToken);

    public Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken) =>
        square.RescheduleBookingAsync(bookingId, bookingVersion, newStartAt, cancellationToken);

    private async Task<T> GetOrRefreshAsync<T>(string key, Func<Task<T>> fetch, CancellationToken cancellationToken)
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
