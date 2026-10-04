using System.Globalization;
using Square;
using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.Square;

namespace ThadTheBarber.Api.Tests.Booking;

public sealed class BookingDtoMapperTests
{
    private readonly ShopTime _shop = ShopTime.ForTimeZone("America/New_York");

    [Fact]
    public void AvailabilityBecomesTimeSlotsInShopTime()
    {
        IEnumerable<AvailableSlot> slots = SquareFixture.Read<SearchAvailabilityResponse>("search-availability.json")
            .Availabilities!
            .Take(2)
            .Select(availability => availability.ToAvailableSlot());

        Assert.Equal(
            [
                new TimeSlot("09:00", "9:00 AM", Available: true),
                new TimeSlot("09:30", "9:30 AM", Available: true),
            ],
            slots.Select(slot => slot.ToTimeSlot(_shop)));
    }

    [Theory]
    [InlineData("2026-10-31T23:30:00Z", "19:30", "7:30 PM")]
    [InlineData("2026-11-01T15:00:00Z", "10:00", "10:00 AM")]
    [InlineData("2026-03-08T14:00:00Z", "10:00", "10:00 AM")]
    public void TimeSlotsFollowDst(string utc, string time, string label)
    {
        AvailableSlot slot = new(DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture), "TMN76Ik4Cpv-ToYe");

        Assert.Equal(new TimeSlot(time, label, Available: true), slot.ToTimeSlot(_shop));
    }

    [Theory]
    [InlineData("2026-10-05", "09:00", "2026-10-05T13:00:00Z")]
    [InlineData("2026-11-01", "10:00", "2026-11-01T15:00:00Z")]
    public void BookingRequestBecomesSquareStartTime(string date, string time, string utc)
    {
        BookingRequest request = new(date, time, "Jordan", "+15405550123");

        Assert.Equal(DateTimeOffset.Parse(utc, CultureInfo.InvariantCulture), request.ToStartAt(_shop));
    }

    [Fact]
    public void CreatedBookingBecomesConfirmation()
    {
        ShopBooking booking = SquareFixture.Read<CreateBookingResponse>("create-booking.json").Booking!.ToShopBooking();
        BookingRequest request = new("2026-10-05", "09:00", "Jordan", "+15405550123");

        Assert.Equal(
            new BookingConfirmation("r1h5tfnj3ybo31", "2026-10-05", "09:00", "Jordan", "+15405550123"),
            booking.ToConfirmation(request, _shop));
    }
}
