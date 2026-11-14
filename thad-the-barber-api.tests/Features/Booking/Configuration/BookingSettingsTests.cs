using System.ComponentModel.DataAnnotations;
using System.Globalization;
using ThadTheBarber.Api.Features.Booking.Configuration;

namespace ThadTheBarber.Api.Tests.Features.Booking.Configuration;

public sealed class BookingSettingsTests
{
    [Theory]
    [InlineData("00:01:00")]
    [InlineData("00:15:00")]
    [InlineData("01:00:00")]
    public void ASensibleLookupSessionLifetimeIsValid(string lifetime)
    {
        Assert.Empty(Validate(lifetime));
    }

    [Theory]
    [InlineData("00:00:00")]
    [InlineData("-00:15:00")]
    [InlineData("00:00:59")]
    [InlineData("01:00:01")]
    [InlineData("1.00:00:00")]
    public void ANonPositiveOrTooLongLookupSessionLifetimeIsRefused(string lifetime)
    {
        ValidationResult failure = Assert.Single(Validate(lifetime));

        Assert.Contains(nameof(BookingSettings.LookupSessionLifetime), failure.MemberNames);
    }

    [Fact]
    public void AnUnsetLookupSessionLifetimeIsRefusedSoStartupFails()
    {
        List<ValidationResult> failures = [];
        BookingSettings settings = new()
        {
            MaxUpcomingPerPhone = 6,
            CapWindow = TimeSpan.FromDays(31),
            NextTimesCacheFor = TimeSpan.FromSeconds(30),
        };

        Validator.TryValidateObject(settings, new ValidationContext(settings), failures, validateAllProperties: true);

        Assert.Contains(failures, failure => failure.MemberNames.Contains(nameof(BookingSettings.LookupSessionLifetime)));
    }

    private static List<ValidationResult> Validate(string lifetime)
    {
        List<ValidationResult> failures = [];
        BookingSettings settings = new()
        {
            MaxUpcomingPerPhone = 6,
            CapWindow = TimeSpan.FromDays(31),
            NextTimesCacheFor = TimeSpan.FromSeconds(30),
            LookupSessionLifetime = TimeSpan.Parse(lifetime, CultureInfo.InvariantCulture),
        };

        Validator.TryValidateObject(settings, new ValidationContext(settings), failures, validateAllProperties: true);
        return failures;
    }
}
