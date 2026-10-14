using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Services;

namespace ThadTheBarber.Api.Features.Booking.Configuration;

public static class BookingSetup
{
    public static IServiceCollection AddBooking(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ManageLinkSettings>()
            .Bind(configuration.GetSection(ManageLinkSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<ManageLinkSettings>, ManageLinkSettingsValidator>();
        services.AddOptions<BookingSettings>()
            .Bind(configuration.GetSection(BookingSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<BookingSettings>, BookingSettingsValidator>();
        services.AddSingleton<ManageTokenSigner>();
        services.AddSingleton<AvailabilityService>();
        services.AddSingleton<BookingService>();
        services.AddSingleton<ManageBookingService>();
        return services;
    }
}
