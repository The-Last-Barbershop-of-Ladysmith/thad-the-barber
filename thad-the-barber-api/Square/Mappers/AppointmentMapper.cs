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
            ToStartAt(booking)
        );
    }

    /// <summary>The time a booking holds, everything <c>CreateBooking</c> was sent for it except the customer.</summary>
    public static TimeSlot ToTimeSlot(this Booking booking)
    {
        AppointmentSegment appointmentSegment = booking.AppointmentSegments?.FirstOrDefault()
            ?? throw MissingField(booking, "appointment segment");

        return new TimeSlot(
            ToStartAt(booking),
            booking.LocationId ?? throw MissingField(booking, "location"),
            appointmentSegment.TeamMemberId,
            appointmentSegment.ServiceVariationId ?? throw MissingField(booking, "service variation"),
            appointmentSegment.ServiceVariationVersion ?? throw MissingField(booking, "service variation version")
        );
    }

    private static DateTimeOffset ToStartAt(Booking booking) =>
        DateTimeOffset.Parse(
            booking.StartAt ?? throw MissingField(booking, "start time"),
            CultureInfo.InvariantCulture).ToUniversalTime();

    private static InvalidOperationException MissingField(Booking booking, string field) => new($"Square booking {booking.Id} has no {field}.");
}
