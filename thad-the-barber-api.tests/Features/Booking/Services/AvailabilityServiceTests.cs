using System.Globalization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

/// <summary>
/// The fixture shop is in America/New_York with no minimum notice and a 365-day maximum advance; its open times run
/// 13:00–20:30 UTC on 2026-10-05 through 2026-10-09. The clock sits at 11:10 shop time on 2026-10-06.
/// </summary>
public sealed class AvailabilityServiceTests
{
    private static readonly DateTimeOffset now = Instant("2026-10-06T15:10:00Z");

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheMonthListsDaysWithTheirOpenTimesFromNowOn()
    {
        List<AvailableDay> days = await Service(new FakeSquareService()).GetAvailableDaysAsync(Date("2026-10-01"), Cancellation);

        Assert.Equal(
            [
                Date("2026-10-06"),
                Date("2026-10-07"),
                Date("2026-10-08"),
                Date("2026-10-09"),
            ],
            days.Select(day => day.Date));
        Assert.Equal(Instant("2026-10-06T15:30:00Z"), days[0].Times[0]);
        Assert.Equal(11, days[0].Times.Count);
        Assert.Equal(16, days[3].Times.Count);
    }

    [Fact]
    public async Task TimesAreGroupedInOrderByTheShopsCalendarDayAcrossTheDstChange()
    {
        FakeSquareService square = new()
        {
            TimeSlots = SlotsAt(
                "2026-12-01T05:00:00Z",
                "2026-11-03T03:30:00Z",
                "2026-12-01T04:59:00Z",
                "2026-11-01T04:00:00Z",
                "2026-11-01T03:59:00Z",
                "2026-11-02T15:00:00Z"),
        };

        List<AvailableDay> days = await Service(square).GetAvailableDaysAsync(Date("2026-11-01"), Cancellation);

        Assert.Equal(
            [
                Day("2026-11-01", "2026-11-01T04:00:00Z"),
                Day("2026-11-02", "2026-11-02T15:00:00Z", "2026-11-03T03:30:00Z"),
                Day("2026-11-30", "2026-12-01T04:59:00Z"),
            ],
            days,
            SameDay);
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

        List<AvailableDay> days = await Service(square).GetAvailableDaysAsync(Date("2026-10-01"), Cancellation);

        Assert.Equal(Instant("2026-10-06T17:30:00Z"), days[0].Times[0]);
    }

    [Fact]
    public async Task TheLastMonthOfTheBookingWindowIsSearchedUpToItsEnd()
    {
        FakeSquareService square = new()
        {
            TimeSlots = SlotsAt(
                "2027-10-06T15:00:00Z",
                "2027-10-06T15:30:00Z"),
        };

        List<AvailableDay> days = await Service(square).GetAvailableDaysAsync(Date("2027-10-01"), Cancellation);

        Assert.Equal([Day("2027-10-06", "2027-10-06T15:00:00Z")], days, SameDay);
    }

    [Theory]
    [InlineData("2026-09-01")]
    [InlineData("2027-11-01")]
    public async Task AMonthOutsideTheBookingWindowIsRejected(string month)
    {
        await Assert.ThrowsAsync<OutsideBookingWindowException>(
            () => Service(new FakeSquareService()).GetAvailableDaysAsync(Date(month), Cancellation));
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

    private static AvailableDay Day(string date, params string[] times) => new(
        Date(date),
        [.. times.Select(Instant)]
    );

    private static bool SameDay(AvailableDay expected, AvailableDay actual) =>
        expected.Date == actual.Date && expected.Times.SequenceEqual(actual.Times);

    private static DateOnly Date(string date) => DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateTimeOffset Instant(string instant) => DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture);
}
