using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Booking.Models;

public sealed record LookupCodeRequest(
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone
);
