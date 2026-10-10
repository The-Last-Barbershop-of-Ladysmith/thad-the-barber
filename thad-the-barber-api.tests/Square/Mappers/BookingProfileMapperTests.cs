using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class BookingProfileMapperTests
{
    [Fact]
    public void BookingProfilesBecomeBookingProfile()
    {
        LocationBookingProfile location = SquareFixture.ReadAs<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single();

        Assert.Equal(
            new BookingProfile(
                IsOnlineBookingEnabled: true,
                MinimumNotice: TimeSpan.Zero,
                MaximumAdvance: TimeSpan.FromDays(365),
                CanCustomersCancel: true,
                SquareBookingSiteUrl: "https://square.site/book/LVF9Q8XN61NA4/thad-the-barber-sandbox-washington-dc"
            ),
            ReadBusinessProfile().ToBookingProfile(location));
    }

    [Fact]
    public void WithoutALocationProfileOnlineBookingIsOff()
    {
        BusinessBookingProfile business = ReadBusinessProfile() with { AllowUserCancel = null };

        BookingProfile profile = business.ToBookingProfile(null);

        Assert.False(profile.IsOnlineBookingEnabled);
        Assert.False(profile.CanCustomersCancel);
        Assert.Null(profile.SquareBookingSiteUrl);
    }

    [Fact]
    public void WithoutAMinimumLeadTimeThereIsNoMinimumNotice()
    {
        BusinessBookingProfile business = ReadBusinessProfile();
        business = business with { BusinessAppointmentSettings = business.BusinessAppointmentSettings! with { MinBookingLeadTimeSeconds = null } };

        Assert.Equal(TimeSpan.Zero, business.ToBookingProfile(null).MinimumNotice);
    }

    [Fact]
    public void ABusinessProfileWithoutAppointmentSettingsThrows()
    {
        BusinessBookingProfile business = ReadBusinessProfile() with { BusinessAppointmentSettings = null };

        Assert.Throws<InvalidOperationException>(() => business.ToBookingProfile(null));
    }

    private static BusinessBookingProfile ReadBusinessProfile() =>
        SquareFixture.ReadAs<GetBusinessBookingProfileResponse>("business-booking-profile.json").BusinessBookingProfile!;
}
