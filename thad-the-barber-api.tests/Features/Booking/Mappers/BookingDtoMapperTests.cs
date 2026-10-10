using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Mappers;

public sealed class BookingDtoMapperTests
{
    [Fact]
    public void AppointmentBecomesConfirmation()
    {
        Assert.Equal(
            new BookingConfirmation(
                "bk_test-0001ab",
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero)
            ),
            new FakeSquareService().CreatedAppointment.ToBookingConfirmationDto());
    }
}
