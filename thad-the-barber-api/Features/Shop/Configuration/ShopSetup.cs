using ThadTheBarber.Api.Features.Shop.Services;

namespace ThadTheBarber.Api.Features.Shop.Configuration;

public static class ShopSetup
{
    public static IServiceCollection AddShop(this IServiceCollection services)
    {
        services.AddSingleton<ShopContentService>();
        services.AddSingleton<AdminShopService>();
        return services;
    }
}
