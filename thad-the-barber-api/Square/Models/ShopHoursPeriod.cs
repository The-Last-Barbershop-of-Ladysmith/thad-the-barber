namespace ThadTheBarber.Api.Square.Models;

public sealed record ShopHoursPeriod(
    DayOfWeek Day,
    TimeOnly Opens,
    TimeOnly Closes);
