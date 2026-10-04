namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>How far ahead customers can book and how long an appointment is, like the UI's <c>BookingRules</c>.</summary>
public sealed record BookingRules(
    int DaysAhead,
    int SlotMinutes
);
