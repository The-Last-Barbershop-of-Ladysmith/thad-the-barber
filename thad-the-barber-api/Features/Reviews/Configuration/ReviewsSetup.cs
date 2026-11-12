using ThadTheBarber.Api.Features.Reviews.Services;

namespace ThadTheBarber.Api.Features.Reviews.Configuration;

public static class ReviewsSetup
{
    public static IServiceCollection AddReviews(this IServiceCollection services)
    {
        services.AddSingleton<ReviewsService>();
        return services;
    }
}
