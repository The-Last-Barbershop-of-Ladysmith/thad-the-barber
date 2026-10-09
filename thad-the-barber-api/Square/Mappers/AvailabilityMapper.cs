using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class AvailabilityMapper
{
    public static TimeSlot ToTimeSlot(this Availability availability)
    {
        AppointmentSegment appointmentSegment = availability.AppointmentSegments?.FirstOrDefault()
            ?? throw MissingField("appointment segment");

        return new TimeSlot(
            DateTimeOffset.Parse(
                availability.StartAt ?? throw MissingField("start time"),
                CultureInfo.InvariantCulture),
            availability.LocationId ?? throw MissingField("location"),
            appointmentSegment.TeamMemberId,
            appointmentSegment.ServiceVariationId ?? throw MissingField("service variation"),
            appointmentSegment.ServiceVariationVersion ?? throw MissingField("service variation version")
        );
    }

    private static InvalidOperationException MissingField(string field) => new($"A Square availability has no {field}.");
}
