using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class BookingProfileMapper
{
    public static BookingProfile ToBookingProfile(this BusinessBookingProfile profile, LocationBookingProfile? location) => new(
        profile.BookingEnabled ?? false,
        TimeSpan.FromSeconds(profile.BusinessAppointmentSettings?.MinBookingLeadTimeSeconds ?? 0),
        TimeSpan.FromSeconds(profile.BusinessAppointmentSettings?.MaxBookingLeadTimeSeconds
            ?? throw new InvalidOperationException("The Square booking profile has no maximum lead time.")),
        profile.AllowUserCancel ?? false,
        location?.BookingSiteUrl
    );
}
