using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Models;
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
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                "token-0001"
            ),
            new FakeSquareService().CreatedAppointment.ToBookingConfirmationDto("token-0001"));
    }

    [Theory]
    [InlineData(AppointmentStatus.Accepted, false)]
    [InlineData(AppointmentStatus.CancelledByCustomer, true)]
    [InlineData(AppointmentStatus.NoShow, false)]
    public void AppointmentBecomesManagedBooking(AppointmentStatus status, bool isCancelled)
    {
        Appointment appointment = new FakeSquareService().CreatedAppointment with
        {
            Status = status,
        };

        Assert.Equal(
            new ManagedBooking(
                "bk_test-0001ab",
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                isCancelled,
                false
            ),
            appointment.ToManagedBookingDto(canChange: false));
    }
}
