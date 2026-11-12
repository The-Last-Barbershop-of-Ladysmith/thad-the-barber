namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>A valid <c>reviews.json</c> made of placeholder people, for the content container of <see cref="FakeMediaStorage"/>.</summary>
public static class FakeReviewsFile
{
    public const string ValidBody = """
        {
          "score": 4.5,
          "count": 12,
          "url": "https://maps.example.test/listing",
          "testimonials": [
            { "author": "Avery Testwell", "text": "First made-up text" },
            { "author": "Jordan Fixture", "text": "Second made-up text", "rating": 4, "source": "Google review" }
          ]
        }
        """;
}
