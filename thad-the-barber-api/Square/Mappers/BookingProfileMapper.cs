using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class BookingProfileMapper
{
    public static BookingProfile ToBookingProfile(this BusinessBookingProfile businessProfile, LocationBookingProfile? locationProfile) => new(
        businessProfile.BookingEnabled ?? false,
        TimeSpan.FromSeconds(businessProfile.BusinessAppointmentSettings?.MinBookingLeadTimeSeconds ?? 0),
        TimeSpan.FromSeconds(businessProfile.BusinessAppointmentSettings?.MaxBookingLeadTimeSeconds
            ?? throw new InvalidOperationException("The Square booking profile has no maximum lead time.")),
        businessProfile.AllowUserCancel ?? false,
        locationProfile?.BookingSiteUrl
    );
}
