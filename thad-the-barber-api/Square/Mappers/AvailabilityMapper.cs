using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class AvailabilityMapper
{
    public static TimeSlot ToTimeSlot(this Availability availability) => new(
        DateTimeOffset.Parse(
            availability.StartAt ?? throw new InvalidOperationException("A Square availability has no start time."),
            CultureInfo.InvariantCulture),
        availability.AppointmentSegments?.FirstOrDefault()?.TeamMemberId
            ?? throw new InvalidOperationException("A Square availability has no team member.")
    );
}
