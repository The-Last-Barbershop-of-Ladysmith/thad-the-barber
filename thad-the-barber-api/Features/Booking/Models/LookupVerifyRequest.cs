using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Booking.Models;

public sealed record LookupVerifyRequest(
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone,
    [Required, RegularExpression(@"^\d{4,10}$", ErrorMessage = "Use the digits from the text.")] string Code
);
