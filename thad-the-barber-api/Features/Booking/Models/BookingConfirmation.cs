namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>The booked appointment, like the UI's <c>BookingConfirmation</c>.</summary>
public sealed record BookingConfirmation(
    string Id,
    string Date,
    string Time,
    string Name,
    string Phone);
