using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.MarketingTexts.Models;

/// <summary>
/// A visitor's own sign-up for the shop's news texts: a 10-digit US <see cref="Phone"/> in E.164 (as in BR-09) and
/// their agreement, which must be true, since the list holds only people who agreed (BR-35).
/// </summary>
public sealed record MarketingSignUpRequest(
    [Required, RegularExpression(@"^\+1\d{10}$", ErrorMessage = "Use +1 and 10 digits.")] string Phone,
    [property: JsonRequired] bool HasConsent
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!HasConsent)
        {
            yield return new ValidationResult("Agree to the texts to sign up.", [nameof(HasConsent)]);
        }
    }
}
