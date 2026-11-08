using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Reviews.Models;
using ThadTheBarber.Api.Features.Reviews.Services;

namespace ThadTheBarber.Api.Features.Reviews.Endpoints;

public static class ReviewsEndpoints
{
    public static IEndpointRouteBuilder MapReviewsEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/reviews", GetReviewsAsync)
            .AllowAnonymous()
            .WithName("GetReviews")
            .WithTags("Reviews");
        return api;
    }

    /// <summary>
    /// The testimonials and the listing rating, from the owner's reviews file. A file that can't be read answers 200
    /// with no testimonials and no rating, so the page just hides the section.
    /// </summary>
    internal static async Task<Ok<ReviewsContent>> GetReviewsAsync(
        ReviewsService reviews,
        CancellationToken cancellationToken)
    {
        return TypedResults.Ok(await reviews.GetAsync(cancellationToken));
    }
}
