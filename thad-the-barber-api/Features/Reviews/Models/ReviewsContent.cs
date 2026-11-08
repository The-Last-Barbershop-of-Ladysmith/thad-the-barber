namespace ThadTheBarber.Api.Features.Reviews.Models;

public sealed record ReviewsContent(
    List<Review> Testimonials,
    ReviewRating? Rating
)
{
    public static ReviewsContent Empty => new([], null);
}
