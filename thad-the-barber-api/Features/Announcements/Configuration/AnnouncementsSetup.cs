using ThadTheBarber.Api.Features.Announcements.Services;

namespace ThadTheBarber.Api.Features.Announcements.Configuration;

public static class AnnouncementsSetup
{
    public static IServiceCollection AddAnnouncements(this IServiceCollection services)
    {
        services.AddSingleton<AnnouncementsService>();
        return services;
    }
}
