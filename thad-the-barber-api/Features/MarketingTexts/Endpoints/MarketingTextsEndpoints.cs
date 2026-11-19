using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Features.MarketingTexts.Endpoints;

public static class MarketingTextsEndpoints
{
    public static IEndpointRouteBuilder MapMarketingTextsEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/marketing-texts/opt-ins", SignUpAsync)
            .WithName("SignUpForMarketingTexts")
            .WithTags("MarketingTexts")
            .NoStore()
            .RequireRateLimiting(RateLimitSetup.ContactPolicy);
        return api;
    }

    /// <summary>
    /// Lists the phone and answers 204, also when it was already listed; <see cref="MarketingSignUpRequest"/>'s rules
    /// are checked before this runs. A sign-up that can't be saved is 503 <c>text_updates_unavailable</c>. It shares the
    /// contact form's per-IP limit, which is as strict as a one-time sign-up needs.
    /// </summary>
    internal static async Task<NoContent> SignUpAsync(
        MarketingSignUpRequest request,
        MarketingOptInService optIns,
        CancellationToken cancellationToken)
    {
        await optIns.SignUpAsync(request.Phone, cancellationToken);
        return TypedResults.NoContent();
    }
}
