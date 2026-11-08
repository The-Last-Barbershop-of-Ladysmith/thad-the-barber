using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Reviews.Configuration;
using ThadTheBarber.Api.Features.Reviews.Models;
using ThadTheBarber.Api.Features.Reviews.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Reviews.Services;

public sealed class ReviewsServiceTests
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(5);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ReadsTheReviewsFileFromTheMediaContainer()
    {
        FakeReviewsHttp blob = new();

        ReviewsContent content = await CreateService(blob, new FakeTimeProvider()).GetAsync(Cancellation);

        Assert.Equal("https://media.example/media-test/content/reviews.json", blob.RequestUri!.AbsoluteUri);
        Assert.Equal(2, content.Testimonials.Count);
        Assert.Equal(new ReviewRating(4.5, 12, "https://maps.example.test/listing"), content.Rating);
    }

    [Fact]
    public async Task KeepsTheFileForTheCacheTimeAndReadsItAgainAfterwards()
    {
        FakeReviewsHttp blob = new();
        FakeTimeProvider time = new();
        using ReviewsService service = CreateService(blob, time);

        await service.GetAsync(Cancellation);
        time.Advance(CacheFor - TimeSpan.FromSeconds(1));
        await service.GetAsync(Cancellation);
        Assert.Equal(1, blob.RequestCount);

        time.Advance(TimeSpan.FromSeconds(1));
        await service.GetAsync(Cancellation);
        Assert.Equal(2, blob.RequestCount);
    }

    [Fact]
    public async Task AnEditToTheFileShowsOnceTheCacheExpires()
    {
        FakeReviewsHttp blob = new();
        FakeTimeProvider time = new();
        using ReviewsService service = CreateService(blob, time);
        await service.GetAsync(Cancellation);

        blob.Body = """{ "testimonials": [{ "author": "Sam Placeholder", "text": "Edited" }] }""";
        time.Advance(CacheFor);
        ReviewsContent content = await service.GetAsync(Cancellation);

        Assert.Equal("Sam Placeholder", Assert.Single(content.Testimonials).Author);
        Assert.Null(content.Rating);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task AMissingOrFailingFileServesNoReviews(HttpStatusCode status)
    {
        FakeReviewsHttp blob = new()
        {
            Status = status,
        };

        ReviewsContent content = await CreateService(blob, new FakeTimeProvider()).GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
        Assert.Null(content.Rating);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{ "items": [] }""")]
    public async Task AFileThatIsNotAReviewsFileServesNoReviews(string body)
    {
        FakeReviewsHttp blob = new()
        {
            Body = body,
        };

        ReviewsContent content = await CreateService(blob, new FakeTimeProvider()).GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
    }

    public static TheoryData<Exception> SendFailures() =>
    [
        new HttpRequestException("The media container is unreachable."),
        new TaskCanceledException("The HttpClient timed out."),
    ];

    [Theory]
    [MemberData(nameof(SendFailures))]
    public async Task AnUnreachableOrSlowContainerServesNoReviews(Exception failure)
    {
        FakeReviewsHttp blob = new()
        {
            Failure = failure,
        };

        ReviewsContent content = await CreateService(blob, new FakeTimeProvider()).GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
    }

    [Fact]
    public async Task AFailedReadIsKeptForTheCacheTimeToo()
    {
        FakeReviewsHttp blob = new()
        {
            Status = HttpStatusCode.NotFound,
        };
        FakeTimeProvider time = new();
        using ReviewsService service = CreateService(blob, time);

        await service.GetAsync(Cancellation);
        await service.GetAsync(Cancellation);

        Assert.Equal(1, blob.RequestCount);
    }

    [Fact]
    public async Task ACallerWhoCancelsGetsACancellation()
    {
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();
        FakeReviewsHttp blob = new()
        {
            Failure = new TaskCanceledException("Cancelled."),
        };

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CreateService(blob, new FakeTimeProvider()).GetAsync(cancelled.Token));
    }

    private static ReviewsService CreateService(FakeReviewsHttp blob, FakeTimeProvider time) =>
        new(
            new FakeHttpClientFactory(blob, new Uri("https://media.example/media-test/")),
            time,
            Options.Create(new ReviewsSettings
            {
                MediaAccountName = "media",
                MediaContainerName = "media-test",
                CacheFor = CacheFor,
            }),
            NullLogger<ReviewsService>.Instance
        );
}
