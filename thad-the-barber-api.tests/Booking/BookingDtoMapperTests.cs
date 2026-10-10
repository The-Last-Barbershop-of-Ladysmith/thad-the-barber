using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Tests.Fakes;

namespace ThadTheBarber.Api.Tests.Booking;

public sealed class BookingDtoMapperTests
{
    [Fact]
    public void AppointmentBecomesConfirmation()
    {
        Assert.Equal(
            new BookingConfirmation(
                "r1h5tfnj3ybo31",
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero)
            ),
            new FakeSquareService().CreatedAppointment.ToConfirmation());
    }
}
