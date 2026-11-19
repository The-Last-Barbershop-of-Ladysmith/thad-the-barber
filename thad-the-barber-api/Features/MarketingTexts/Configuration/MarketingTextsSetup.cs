using ThadTheBarber.Api.Features.MarketingTexts.Services;

namespace ThadTheBarber.Api.Features.MarketingTexts.Configuration;

public static class MarketingTextsSetup
{
    public static IServiceCollection AddMarketingTexts(this IServiceCollection services)
    {
        services.AddSingleton<MarketingOptInService>();
        return services;
    }
}
