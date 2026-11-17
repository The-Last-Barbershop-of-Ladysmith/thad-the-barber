using System.ComponentModel.DataAnnotations;
using ThadTheBarber.Api.Features.Announcements.Mappers;

namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>A button to save; its link follows the same rule the public list applies (<see cref="AnnouncementsFileMapper.IsAllowedLink"/>).</summary>
public sealed record AnnouncementButtonInput(
    [Required, MaxLength(40)] string Label,
    [Required, MaxLength(500)] string Url,
    AnnouncementButtonVariant Variant = AnnouncementButtonVariant.Outlined
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Label))
        {
            yield return new ValidationResult("Give the button a label.", [nameof(Label)]);
        }

        if (!AnnouncementsFileMapper.IsAllowedLink(Url.Trim()))
        {
            yield return new ValidationResult("Use a page on this site, an https link, a tel: or a mailto: link.", [nameof(Url)]);
        }
    }
}
