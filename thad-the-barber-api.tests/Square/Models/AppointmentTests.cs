using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Square.Models;

public sealed class AppointmentTests
{
    [Theory]
    [InlineData(AppointmentStatus.Pending, true, false)]
    [InlineData(AppointmentStatus.Accepted, true, false)]
    [InlineData(AppointmentStatus.CancelledByCustomer, false, true)]
    [InlineData(AppointmentStatus.CancelledBySeller, false, true)]
    [InlineData(AppointmentStatus.Declined, false, true)]
    [InlineData(AppointmentStatus.NoShow, false, false)]
    public void StatusSaysWhetherItsActiveOrCancelled(AppointmentStatus status, bool isActive, bool isCancelled)
    {
        Appointment appointment = new FakeSquareService().CreatedAppointment with
        {
            Status = status,
        };

        Assert.Equal(isActive, appointment.IsActive);
        Assert.Equal(isCancelled, appointment.IsCancelled);
    }
}
