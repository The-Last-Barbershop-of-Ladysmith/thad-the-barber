using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>
/// One announcement to save, in the shape of an <c>announcements.json</c> item. It shows from <see cref="StartDate"/>
/// through <see cref="EndDate"/>, so the end can't be before the start.
/// </summary>
public sealed record AnnouncementInput(
    [Required, MaxLength(120)] string Title,
    [MaxLength(5000)] string? BodyHtml,
    [property: JsonRequired] DateOnly StartDate,
    [property: JsonRequired] DateOnly EndDate,
    AnnouncementImageInput? Image,
    [MaxLength(4)] List<AnnouncementButtonInput>? Buttons
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
        {
            yield return new ValidationResult("Give the announcement a title.", [nameof(Title)]);
        }

        if (EndDate < StartDate)
        {
            yield return new ValidationResult("The last day can't be before the first.", [nameof(EndDate)]);
        }
    }
}
