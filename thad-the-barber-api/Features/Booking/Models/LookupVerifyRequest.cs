using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// <c>POST /api/bookings/lookup/verify</c>: the code the customer received for <see cref="Phone"/>. A wrong or
/// expired code is 400 <c>code_invalid</c>; too many tries is 429 <c>rate_limited</c> with <c>Retry-After</c>.
/// </summary>
public sealed record LookupVerifyRequest(
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone,
    [Required, RegularExpression(@"^\d{4,10}$", ErrorMessage = "Use the digits from the text.")] string Code
);
