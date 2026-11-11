using ThadTheBarber.Api.Features.Gallery.Services;

namespace ThadTheBarber.Api.Features.Gallery.Configuration;

public static class GallerySetup
{
    public static IServiceCollection AddGallery(this IServiceCollection services)
    {
        services.AddSingleton<GalleryService>();
        return services;
    }
}
