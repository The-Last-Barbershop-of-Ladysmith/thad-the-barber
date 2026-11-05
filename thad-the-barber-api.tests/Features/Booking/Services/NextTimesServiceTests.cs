using System.Globalization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

/// <summary>The clock sits at 11:10 shop time on 2026-10-06, with open times from 15:30 UTC (see <c>AvailabilityServiceTests</c>).</summary>
public sealed class NextTimesServiceTests
{
    private static readonly TimeSpan cacheFor = TimeSpan.FromSeconds(30);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ReturnsTheEarliestTimesUpToTheCount()
    {
        List<DateTimeOffset> times = await Service(new FakeSquareService(), new FakeTimeProvider(Now())).GetNextAsync(4, Cancellation);

        Assert.Equal(4, times.Count);
        Assert.Equal(DateTimeOffset.Parse("2026-10-06T15:30:00Z", CultureInfo.InvariantCulture), times[0]);
        Assert.Equal(times.Order(), times);
    }

    [Fact]
    public async Task SquareIsSearchedOnceForRequestsWithinTheCacheTimeWhateverTheCount()
    {
        FakeSquareService square = new();
        FakeTimeProvider clock = new(Now());
        NextTimesService service = Service(square, clock);

        await service.GetNextAsync(6, Cancellation);
        clock.Advance(cacheFor - TimeSpan.FromSeconds(1));
        List<DateTimeOffset> fewer = await service.GetNextAsync(2, Cancellation);

        Assert.Equal(1, square.TimeSlotSearches);
        Assert.Equal(2, fewer.Count);
    }

    [Fact]
    public async Task SquareIsSearchedAgainOnceTheCacheTimeHasPassed()
    {
        FakeSquareService square = new();
        FakeTimeProvider clock = new(Now());
        NextTimesService service = Service(square, clock);

        await service.GetNextAsync(6, Cancellation);
        clock.Advance(cacheFor);
        await service.GetNextAsync(6, Cancellation);

        Assert.Equal(2, square.TimeSlotSearches);
    }

    [Fact]
    public async Task ConcurrentRequestsShareOneSearch()
    {
        FakeSquareService square = new();
        NextTimesService service = Service(square, new FakeTimeProvider(Now()));

        await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => service.GetNextAsync(6, Cancellation)));

        Assert.Equal(1, square.TimeSlotSearches);
    }

    [Fact]
    public async Task AFailedSearchIsNotKeptSoTheNextRequestTriesAgain()
    {
        FakeSquareService square = new()
        {
            ReadFailure = new HttpRequestException("Square is down."),
        };
        NextTimesService service = Service(square, new FakeTimeProvider(Now()));

        await Assert.ThrowsAsync<HttpRequestException>(() => service.GetNextAsync(6, Cancellation));
        square.ReadFailure = null;
        List<DateTimeOffset> times = await service.GetNextAsync(6, Cancellation);

        Assert.Equal(6, times.Count);
    }

    [Fact]
    public async Task NoOpenTimesIsAnEmptyList()
    {
        FakeSquareService square = new()
        {
            TimeSlots = [],
        };

        List<DateTimeOffset> times = await Service(square, new FakeTimeProvider(Now())).GetNextAsync(6, Cancellation);

        Assert.Empty(times);
    }

    private static DateTimeOffset Now() => DateTimeOffset.Parse("2026-10-06T15:10:00Z", CultureInfo.InvariantCulture);

    private static NextTimesService Service(FakeSquareService square, FakeTimeProvider clock) => new(
        new AvailabilityService(
            square,
            new BookableServiceResolver(square, Options.Create(new SquareSettings())),
            clock),
        clock,
        Options.Create(new BookingSettings
        {
            NextTimesCacheFor = cacheFor,
        })
    );
}
