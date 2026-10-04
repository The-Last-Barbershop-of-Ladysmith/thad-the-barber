using Square;
using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.Square;

namespace ThadTheBarber.Api.Tests.Booking;

public sealed class BookingDtoMapperTests
{
    [Fact]
    public void AvailabilityBecomesUtcTimeSlots()
    {
        IEnumerable<AvailableSlot> slots = SquareFixture.Read<SearchAvailabilityResponse>("search-availability.json")
            .Availabilities!
            .Take(2)
            .Select(availability => availability.ToAvailableSlot());

        Assert.Equal(
            [
                new TimeSlot(
                    new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                    Available: true
                ),
                new TimeSlot(
                    new DateTimeOffset(2026, 10, 5, 13, 30, 0, TimeSpan.Zero),
                    Available: true
                ),
            ],
            slots.Select(slot => slot.ToTimeSlot()));
    }

    [Fact]
    public void TimeSlotsAreUtcWhateverOffsetTheyCameWith()
    {
        AvailableSlot slot = new(
            new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.FromHours(-4)),
            "TMN76Ik4Cpv-ToYe"
        );

        Assert.Equal(TimeSpan.Zero, slot.ToTimeSlot().StartAt.Offset);
    }

    [Fact]
    public void CreatedBookingBecomesConfirmation()
    {
        ShopBooking booking = SquareFixture.Read<CreateBookingResponse>("create-booking.json").Booking!.ToShopBooking();
        BookingRequest request = new(
            new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
            "Jordan",
            "+15405550123"
        );

        Assert.Equal(
            new BookingConfirmation(
                "r1h5tfnj3ybo31",
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                "Jordan",
                "+15405550123"
            ),
            booking.ToConfirmation(request));
    }
}
