using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class AppointmentMapper
{
    public static Appointment ToAppointment(this Booking booking) => new(
        booking.Id ?? throw new InvalidOperationException("A Square booking has no id."),
        booking.Version ?? 0,
        Enum.Parse<AppointmentStatus>(
            (booking.Status ?? throw new InvalidOperationException($"Square booking {booking.Id} has no status.")).Value.Replace("_", string.Empty, StringComparison.Ordinal),
            ignoreCase: true),
        DateTimeOffset.Parse(
            booking.StartAt ?? throw new InvalidOperationException($"Square booking {booking.Id} has no start time."),
            CultureInfo.InvariantCulture)
    );
}
