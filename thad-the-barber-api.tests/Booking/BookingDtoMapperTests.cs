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
    public void AppointmentBecomesConfirmation()
    {
        Appointment appointment = SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!.ToAppointment();

        Assert.Equal(
            new BookingConfirmation(
                "r1h5tfnj3ybo31",
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero)
            ),
            appointment.ToConfirmation());
    }

    [Fact]
    public void ConfirmationsAreUtcWhateverOffsetTheAppointmentCameWith()
    {
        Appointment appointment = SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!.ToAppointment() with
        {
            StartAt = new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.FromHours(-4)),
        };

        Assert.Equal(TimeSpan.Zero, appointment.ToConfirmation().StartAt.Offset);
    }
}
