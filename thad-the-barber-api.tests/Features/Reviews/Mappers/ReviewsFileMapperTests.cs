using System.Text.Json;
using ThadTheBarber.Api.Features.Reviews.Mappers;
using ThadTheBarber.Api.Features.Reviews.Models;

namespace ThadTheBarber.Api.Tests.Features.Reviews.Mappers;

public sealed class ReviewsFileMapperTests
{
    [Fact]
    public void TestimonialsGetNumberedIdsFiveStarsAndAPlainSourceUnlessTheFileSaysOtherwise()
    {
        ReviewsContent content = Parse("""
            { "testimonials": [
              { "author": "Avery Testwell", "text": "First made-up text" },
              { "author": " Jordan Fixture ", "text": "Second made-up text", "rating": 4, "source": "Google review" }
            ] }
            """);

        Assert.Equal(
            [
                new Review("review-0", "First made-up text", "Avery Testwell", "Customer review", 5),
                new Review("review-1", "Second made-up text", "Jordan Fixture", "Google review", 4),
            ],
            content.Testimonials
        );
    }

    [Fact]
    public void ATestimonialWithoutAnAuthorOrTextIsSkippedAndTheRestAreNumberedWithoutGaps()
    {
        ReviewsContent content = Parse("""
            { "testimonials": [
              { "author": "No Text" },
              "not an object",
              { "text": "No author" },
              { "author": "  ", "text": "Blank author" },
              { "author": 7, "text": "Author is a number" },
              { "author": "Sam Placeholder", "text": "Kept" }
            ] }
            """);

        Review kept = Assert.Single(content.Testimonials);
        Assert.Equal("review-0", kept.Id);
        Assert.Equal("Sam Placeholder", kept.Author);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("6")]
    [InlineData("4.5")]
    [InlineData("\"5\"")]
    [InlineData("null")]
    public void ARatingThatIsNotAWholeNumberFromOneToFiveFallsBackToFiveStars(string rating)
    {
        ReviewsContent content = Parse($$"""{ "testimonials": [{ "author": "Avery Testwell", "text": "Made-up text", "rating": {{rating}} }] }""");

        Assert.Equal(5, Assert.Single(content.Testimonials).Rating);
    }

    [Fact]
    public void TheListingRatingKeepsItsScoreCountAndHttpsLink()
    {
        ReviewsContent content = Parse("""{ "score": 4.5, "count": 12, "url": "https://maps.example.test/listing", "testimonials": [] }""");

        Assert.Equal(new ReviewRating(4.5, 12, "https://maps.example.test/listing"), content.Rating);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("http://maps.example.test/listing")]
    [InlineData("/relative")]
    [InlineData("")]
    public void ALinkThatIsNotHttpsIsDroppedButTheRatingStays(string url)
    {
        ReviewsContent content = Parse($$"""{ "score": 5, "count": 0, "url": "{{url}}", "testimonials": [] }""");

        Assert.Equal(new ReviewRating(5, 0, null), content.Rating);
    }

    [Theory]
    [InlineData("""{ "testimonials": [] }""")]
    [InlineData("""{ "score": 4.9, "testimonials": [] }""")]
    [InlineData("""{ "count": 10, "testimonials": [] }""")]
    [InlineData("""{ "score": 5.1, "count": 10, "testimonials": [] }""")]
    [InlineData("""{ "score": -1, "count": 10, "testimonials": [] }""")]
    [InlineData("""{ "score": "4.9", "count": 10, "testimonials": [] }""")]
    [InlineData("""{ "score": 4.9, "count": 10.5, "testimonials": [] }""")]
    [InlineData("""{ "score": 4.9, "count": -3, "testimonials": [] }""")]
    public void ARatingWithoutAValidScoreAndWholeCountIsLeftOut(string file)
    {
        Assert.Null(Parse(file).Rating);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\"text\"")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("""{ "testimonials": "none" }""")]
    public void AFileThatIsNotAnObjectWithATestimonialsListIsRejected(string file)
    {
        Assert.Throws<JsonException>(() => Parse(file));
    }

    private static ReviewsContent Parse(string file) => JsonDocument.Parse(file).RootElement.ToReviewsContent();
}
