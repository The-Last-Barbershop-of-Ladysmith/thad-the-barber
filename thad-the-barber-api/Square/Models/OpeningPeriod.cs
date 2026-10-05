namespace ThadTheBarber.Api.Square.Models;

/// <summary>One stretch of opening hours on one day, in the shop's timezone.</summary>
public sealed record OpeningPeriod(
    DayOfWeek Day,
    TimeOnly Opens,
    TimeOnly Closes
);
