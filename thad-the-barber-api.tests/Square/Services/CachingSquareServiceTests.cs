using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class CachingSquareServiceTests
{
    private readonly FakeSquareService _square = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 4, 12, 0, 0, TimeSpan.Zero));
    private readonly FakeLogger<CachingSquareService> _logger = new();
    private readonly CachingSquareService _cached;

    public CachingSquareServiceTests()
    {
        _cached = new CachingSquareService(
            _square,
            new MemoryCache(new MemoryCacheOptions()),
            _time,
            _logger
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASecondReadWithinTheHourIsServedFromTheCache()
    {
        await _cached.GetShopDetailsAsync(Cancellation);
        await _cached.GetBookingProfileAsync("LOCATION0TEST", Cancellation);
        await _cached.GetBookableServicesAsync(Cancellation);
        _time.Advance(CachingSquareService.CacheFor - TimeSpan.FromSeconds(1));

        await _cached.GetShopDetailsAsync(Cancellation);
        await _cached.GetBookingProfileAsync("LOCATION0TEST", Cancellation);
        await _cached.GetBookableServicesAsync(Cancellation);

        Assert.Equal(1, _square.ShopDetailsReads);
        Assert.Equal(1, _square.BookingProfileReads);
        Assert.Equal(1, _square.CatalogSearches);
    }

    [Fact]
    public async Task AReadAfterTheHourGoesBackToSquare()
    {
        await _cached.GetShopDetailsAsync(Cancellation);
        _time.Advance(CachingSquareService.CacheFor);

        await _cached.GetShopDetailsAsync(Cancellation);

        Assert.Equal(2, _square.ShopDetailsReads);
    }

    [Fact]
    public async Task BookingProfilesAreCachedPerLocation()
    {
        await _cached.GetBookingProfileAsync("LOCATION0TEST", Cancellation);
        await _cached.GetBookingProfileAsync("LOCATION1TEST", Cancellation);

        Assert.Equal(2, _square.BookingProfileReads);
    }

    [Fact]
    public async Task WhenSquareFailsTheLastCopyIsServedAndAWarningLogged()
    {
        ShopDetails fetched = await _cached.GetShopDetailsAsync(Cancellation);
        _time.Advance(CachingSquareService.CacheFor);
        _square.ReadFailure = new HttpRequestException("Square is down.");

        ShopDetails served = await _cached.GetShopDetailsAsync(Cancellation);

        Assert.Same(fetched, served);
        Assert.Equal(2, _square.ShopDetailsReads);
        Assert.Equal(LogLevel.Warning, _logger.LatestRecord.Level);
        Assert.Same(_square.ReadFailure, _logger.LatestRecord.Exception);
    }

    [Fact]
    public async Task WhenSquareFailsWithNothingCachedTheCallerGetsTheFailure()
    {
        _square.ReadFailure = new HttpRequestException("Square is down.");

        await Assert.ThrowsAsync<HttpRequestException>(() => _cached.GetShopDetailsAsync(Cancellation));
    }

    [Fact]
    public async Task ACancelledReadIsntAnsweredWithTheLastCopy()
    {
        await _cached.GetShopDetailsAsync(Cancellation);
        _time.Advance(CachingSquareService.CacheFor);
        _square.ReadFailure = new TaskCanceledException();
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();

        await Assert.ThrowsAsync<TaskCanceledException>(() => _cached.GetShopDetailsAsync(cancelled.Token));
    }

    [Fact]
    public async Task ConnectionChecksAvailabilityAndBookingCallsAlwaysReachSquare()
    {
        BookableService bookableService = _square.BookableServices.Single();
        DateTimeRange allTime = new(
            DateTimeOffset.MinValue,
            DateTimeOffset.MaxValue
        );

        await _cached.CheckConnectionAsync(Cancellation);
        await _cached.CheckConnectionAsync(Cancellation);

        Assert.Equal(2, _square.Checks);
        Assert.Equal(_square.TimeSlots, await _cached.SearchAvailableTimeSlotsAsync("LOCATION0TEST", bookableService, allTime, Cancellation));
        Assert.Equal(_square.CustomerId, await _cached.FindCustomerIdAsync("+15550100123", Cancellation));
        Assert.Equal(_square.CreatedCustomerId, await _cached.CreateCustomerAsync("Test Customer", "+15550100123", "key-1", Cancellation));
        Assert.Equal(_square.CreatedAppointment, await _cached.CreateBookingAsync("CUSTOMER0TEST", _square.TimeSlots[0], "key-2", Cancellation));
        Assert.Equal(_square.CancelledAppointment, await _cached.CancelBookingAsync("BOOKING0TEST", 1, Cancellation));
        Assert.Equal(_square.RescheduledAppointment, await _cached.RescheduleBookingAsync("BOOKING0TEST", 1, _square.TimeSlots[0].StartAt, Cancellation));
    }
}
