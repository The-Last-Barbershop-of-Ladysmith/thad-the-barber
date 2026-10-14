using ThadTheBarber.Api.Features.Booking.Configuration;

namespace ThadTheBarber.Api.Tests.Features.Booking.Configuration;

public sealed class BookingSettingsValidatorTests
{
    private static readonly BookingSettingsValidator validator = new();

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void AMissingOrNegativeCapFailsStartup(int maxUpcomingPerPhone)
    {
        Assert.True(validator.Validate(null, Settings(maxUpcomingPerPhone)).Failed);
    }

    [Fact]
    public void ACapOfOneIsAccepted()
    {
        Assert.True(validator.Validate(null, Settings(1)).Succeeded);
    }

    private static BookingSettings Settings(int maxUpcomingPerPhone) => new()
    {
        MaxUpcomingPerPhone = maxUpcomingPerPhone,
    };
}
