namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>One bookable time on a day, like the UI's <c>TimeSlot</c>.</summary>
public sealed record TimeSlot(
    string Time,
    string Label,
    bool Available);
