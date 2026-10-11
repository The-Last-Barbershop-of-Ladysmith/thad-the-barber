using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// A customer's booking. <see cref="StartAt"/> is one of the UTC start times availability returned, sent back
/// unchanged; <see cref="IdempotencyKey"/> is a UUID the client generates once per booking attempt. The name and phone
/// follow BR-09: at least 2 characters, and a 10-digit US number in E.164.
/// </summary>
public sealed record BookingRequest(
    [property: JsonRequired] DateTimeOffset StartAt,
    [Required, MinLength(2)] string Name,
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone,
    [property: JsonRequired] Guid IdempotencyKey
);
