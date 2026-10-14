using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Features.Booking.Configuration;

/// <summary>Fails startup when the cap is missing, since a zero cap would refuse every booking.</summary>
public sealed class BookingSettingsValidator : IValidateOptions<BookingSettings>
{
    public ValidateOptionsResult Validate(string? name, BookingSettings options)
    {
        if (options.MaxUpcomingPerPhone < 1)
        {
            return ValidateOptionsResult.Fail($"{BookingSettings.SectionName}:{nameof(BookingSettings.MaxUpcomingPerPhone)} must be at least 1.");
        }

        return ValidateOptionsResult.Success;
    }
}
