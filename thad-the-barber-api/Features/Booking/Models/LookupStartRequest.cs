using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// <c>POST /api/bookings/lookup/start</c>: asks for a text code to the phone. The answer is 202 whether or not the
/// phone has bookings, so it can't be used to find out who books here (BR-20). The phone follows BR-09.
/// </summary>
public sealed record LookupStartRequest(
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone
);
