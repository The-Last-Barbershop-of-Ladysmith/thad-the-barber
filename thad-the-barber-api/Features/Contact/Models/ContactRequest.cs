using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Contact.Models;

/// <summary>
/// A message to the shop. A question or an issue must say who to answer: a <see cref="Name"/> and an
/// <see cref="Email"/> or <see cref="Phone"/> (a 10-digit US number in E.164, as in BR-09); for feedback they are
/// optional, but are still checked when given. An issue also names the <see cref="PageOrBooking"/> involved, and its
/// <see cref="Message"/> says what happened.
/// </summary>
public sealed record ContactRequest(
    [property: JsonRequired] ContactCategory Category,
    [Required, MaxLength(2000)] string Message,
    [MaxLength(250)] string? Name,
    [EmailAddress, MaxLength(254)] string? Email,
    [RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string? Phone,
    [MaxLength(300)] string? PageOrBooking
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Category is ContactCategory.Feedback)
        {
            yield break;
        }

        if (string.IsNullOrWhiteSpace(Name))
        {
            yield return new ValidationResult("Say who to answer.", [nameof(Name)]);
        }

        if (string.IsNullOrWhiteSpace(Email) && string.IsNullOrWhiteSpace(Phone))
        {
            yield return new ValidationResult("Give an email or a phone number.", [nameof(Email), nameof(Phone)]);
        }

        if (Category is ContactCategory.Issue && string.IsNullOrWhiteSpace(PageOrBooking))
        {
            yield return new ValidationResult("Say which page or booking it happened on.", [nameof(PageOrBooking)]);
        }
    }
}
