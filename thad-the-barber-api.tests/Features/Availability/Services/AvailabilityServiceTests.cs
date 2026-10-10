using System.Globalization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Availability.Exceptions;
using ThadTheBarber.Api.Features.Availability.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Availability.Services;

/// <summary>
/// The fixture shop is in America/New_York with no minimum notice and a 365-day maximum advance; its open times run
/// 13:00–20:30 UTC on 2026-10-05 through 2026-10-09. The clock sits at 11:10 shop time on 2026-10-06.
/// </summary>
public sealed class AvailabilityServiceTests
{
    private static readonly DateTimeOffset now = Instant("2026-10-06T15:10:00Z");

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheMonthListsOnlyDaysWithAnOpenTimeFromNowOn()
    {
        List<DateOnly> dates = await Service(new FakeSquareService()).GetAvailableDatesAsync(Date("2026-10-01"), Cancellation);

        Assert.Equal(
            [
                Date("2026-10-06"),
                Date("2026-10-07"),
                Date("2026-10-08"),
                Date("2026-10-09"),
            ],
            dates);
    }

    [Fact]
    public async Task TheMonthGroupsTimesByTheShopsCalendarDayAcrossTheDstChange()
    {
        FakeSquareService square = new()
        {
            TimeSlots = SlotsAt(
                "2026-11-01T03:59:00Z",
                "2026-11-01T04:00:00Z",
                "2026-11-03T03:30:00Z",
                "2026-12-01T04:59:00Z",
                "2026-12-01T05:00:00Z"),
        };

        List<DateOnly> dates = await Service(square).GetAvailableDatesAsync(Date("2026-11-01"), Cancellation);

        Assert.Equal(
            [
                Date("2026-11-01"),
                Date("2026-11-02"),
                Date("2026-11-30"),
            ],
            dates);
    }

    [Fact]
    public async Task TodaysPastTimesArentReturned()
    {
        List<DateTimeOffset> times = await Service(new FakeSquareService()).GetAvailableTimesAsync(Date("2026-10-06"), Cancellation);

        Assert.Equal(Instant("2026-10-06T15:30:00Z"), times[0]);
        Assert.Equal(11, times.Count);
    }

    [Fact]
    public async Task TimesInsideTheMinimumNoticeArentReturned()
    {
        FakeSquareService square = new()
        {
            BookingProfile = new FakeSquareService().BookingProfile with
            {
                MinimumNotice = TimeSpan.FromHours(2),
            },
        };

        List<DateTimeOffset> times = await Service(square).GetAvailableTimesAsync(Date("2026-10-06"), Cancellation);

        Assert.Equal(Instant("2026-10-06T17:30:00Z"), times[0]);
    }

    [Fact]
    public async Task ADaysTimesStayWithinItsShopCalendarDay()
    {
        FakeSquareService square = new()
        {
            TimeSlots = SlotsAt(
                "2026-10-08T03:59:00Z",
                "2026-10-08T04:00:00Z",
                "2026-10-09T03:59:00Z",
                "2026-10-09T04:00:00Z"),
        };

        List<DateTimeOffset> times = await Service(square).GetAvailableTimesAsync(Date("2026-10-08"), Cancellation);

        Assert.Equal(
            [
                Instant("2026-10-08T04:00:00Z"),
                Instant("2026-10-09T03:59:00Z"),
            ],
            times);
    }

    [Theory]
    [InlineData("2026-10-05")]
    [InlineData("2027-10-07")]
    public async Task ADayOutsideTheBookingWindowIsRejected(string date)
    {
        await Assert.ThrowsAsync<OutsideBookingWindowException>(
            () => Service(new FakeSquareService()).GetAvailableTimesAsync(Date(date), Cancellation));
    }

    [Theory]
    [InlineData("2026-09-01")]
    [InlineData("2027-11-01")]
    public async Task AMonthOutsideTheBookingWindowIsRejected(string month)
    {
        await Assert.ThrowsAsync<OutsideBookingWindowException>(
            () => Service(new FakeSquareService()).GetAvailableDatesAsync(Date(month), Cancellation));
    }

    [Fact]
    public async Task TheLastDayOfTheBookingWindowIsSearchedUpToItsEnd()
    {
        FakeSquareService square = new()
        {
            TimeSlots = SlotsAt(
                "2027-10-06T15:00:00Z",
                "2027-10-06T15:30:00Z"),
        };

        List<DateTimeOffset> times = await Service(square).GetAvailableTimesAsync(Date("2027-10-06"), Cancellation);

        Assert.Equal([Instant("2027-10-06T15:00:00Z")], times);
    }

    private static AvailabilityService Service(FakeSquareService square) => new(
        square,
        new BookableServiceResolver(square, Options.Create(new SquareSettings())),
        new FakeTimeProvider(now)
    );

    private static List<TimeSlot> SlotsAt(params string[] instants)
    {
        TimeSlot fixtureSlot = new FakeSquareService().TimeSlots[0];
        return [.. instants.Select(instant => fixtureSlot with { StartAt = Instant(instant) })];
    }

    private static DateOnly Date(string date) => DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateTimeOffset Instant(string instant) => DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture);
}
