using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// One open day, in the shop's timezone. <see cref="Day"/> goes out as a number, 0 = Sunday, like JavaScript's
/// <c>Date.getDay()</c>; <see cref="Opens"/> and <see cref="Closes"/> as <c>"HH:mm:ss"</c>.
/// </summary>
public sealed record OpeningHours(
    [property: JsonConverter(typeof(JsonNumberEnumConverter<DayOfWeek>))] DayOfWeek Day,
    TimeOnly Opens,
    TimeOnly Closes
);
