using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class AppointmentMapper
{
    public static Appointment ToAppointment(this Booking booking)
    {
        string status = booking.Status?.Value ?? throw MissingField(booking, "status");

        return new Appointment(
            booking.Id ?? throw new InvalidOperationException("A Square booking has no id."),
            booking.Version ?? throw MissingField(booking, "version"),
            Enum.Parse<AppointmentStatus>(status.Replace("_", string.Empty, StringComparison.Ordinal), ignoreCase: true),
            DateTimeOffset.Parse(
                booking.StartAt ?? throw MissingField(booking, "start time"),
                CultureInfo.InvariantCulture).ToUniversalTime()
        );
    }

    private static InvalidOperationException MissingField(Booking booking, string field) => new($"Square booking {booking.Id} has no {field}.");
}
