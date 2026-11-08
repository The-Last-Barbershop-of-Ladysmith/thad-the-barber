using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Reviews.Endpoints;

public sealed class ReviewsEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ReviewsReturnsTheTestimonialsAndTheListingRatingFromTheFile()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/reviews", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        JsonElement second = body.GetProperty("testimonials")[1];
        Assert.Equal(2, body.GetProperty("testimonials").GetArrayLength());
        Assert.Equal("review-1", second.GetProperty("id").GetString());
        Assert.Equal("Second made-up text", second.GetProperty("quote").GetString());
        Assert.Equal("Jordan Fixture", second.GetProperty("author").GetString());
        Assert.Equal("Google review", second.GetProperty("source").GetString());
        Assert.Equal(4, second.GetProperty("rating").GetInt32());
        Assert.Equal(4.5, body.GetProperty("rating").GetProperty("score").GetDouble());
        Assert.Equal(12, body.GetProperty("rating").GetProperty("count").GetInt32());
        Assert.Equal("https://maps.example.test/listing", body.GetProperty("rating").GetProperty("url").GetString());
    }

    [Fact]
    public async Task ReviewsNeedsNoSessionToken()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync("/api/reviews", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReviewsIs200WithNothingWhenTheFileIsMissing()
    {
        using ApiFactory api = new(reviews: new FakeReviewsHttp
        {
            Status = HttpStatusCode.NotFound,
        });

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/reviews", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(0, body.GetProperty("testimonials").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("rating").ValueKind);
    }
}
