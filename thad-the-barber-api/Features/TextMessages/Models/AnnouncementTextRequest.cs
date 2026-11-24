using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>Texts an announcement to the subscribers with this exact <see cref="Message"/>, on its first day.</summary>
public sealed record AnnouncementTextRequest(
    [Required, MaxLength(120)] string Title,
    [property: JsonRequired] DateOnly StartDate,
    [Required, MaxLength(AnnouncementTextRequest.MaxMessageLength)] string Message
) : IValidatableObject
{
    public const int MaxMessageLength = 480;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
        {
            yield return new ValidationResult("Give the announcement a title.", [nameof(Title)]);
        }

        if (string.IsNullOrWhiteSpace(Message))
        {
            yield return new ValidationResult("Write the text to send.", [nameof(Message)]);
        }
    }
}
