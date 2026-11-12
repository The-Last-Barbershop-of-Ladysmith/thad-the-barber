using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Reviews.Models;
using ThadTheBarber.Api.Features.Reviews.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Reviews.Services;

public sealed class ReviewsServiceTests
{
    private const string File = "reviews.json";

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new();
    private readonly ReviewsService _reviews;

    public ReviewsServiceTests()
    {
        _storage.ContentFiles[File] = FakeReviewsFile.ValidBody;
        _reviews = new ReviewsService(
            _storage,
            FakeStaleCache.Create(_time),
            Options.Create(FakeMediaStorageSettings.Create())
        );
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ReadsTheReviewsFileFromTheContentContainer()
    {
        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Equal(2, content.Testimonials.Count);
        Assert.Equal(new ReviewRating(4.5, 12, "https://maps.example.test/listing"), content.Rating);
    }

    [Fact]
    public async Task KeepsTheFileUntilTheCacheTimeEndsAndReadsItAgainAfterwards()
    {
        await _reviews.GetAsync(Cancellation);
        _time.Advance(StaleCache.CacheFor - TimeSpan.FromSeconds(1));
        await _reviews.GetAsync(Cancellation);
        Assert.Equal(1, _storage.Calls);

        _time.Advance(TimeSpan.FromSeconds(1));
        await _reviews.GetAsync(Cancellation);
        Assert.Equal(2, _storage.Calls);
    }

    [Fact]
    public async Task AnEditShowsOnTheNextLoadOnceTheFileIsMarkedStale()
    {
        await _reviews.GetAsync(Cancellation);

        _storage.ContentFiles[File] = """{ "testimonials": [{ "author": "Sam Placeholder", "text": "Edited" }] }""";
        _reviews.MarkStale();
        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Equal("Sam Placeholder", Assert.Single(content.Testimonials).Author);
        Assert.Null(content.Rating);
    }

    [Fact]
    public async Task AMissingFileServesNoReviews()
    {
        _storage.ContentFiles.Remove(File);

        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
        Assert.Null(content.Rating);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{ "items": [] }""")]
    public async Task AFileThatIsNotAReviewsFileServesNoReviewsWhenThereIsNoEarlierCopy(string body)
    {
        _storage.ContentFiles[File] = body;

        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
    }

    [Fact]
    public async Task ABrokenEditKeepsServingTheLastGoodReviews()
    {
        await _reviews.GetAsync(Cancellation);

        _storage.ContentFiles[File] = "not json";
        _reviews.MarkStale();
        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Equal(2, content.Testimonials.Count);
    }

    [Fact]
    public async Task UnreachableStorageServesNoReviewsWhenThereIsNoEarlierCopy()
    {
        _storage.Failure = new HttpRequestException("The content container is unreachable.");

        ReviewsContent content = await _reviews.GetAsync(Cancellation);

        Assert.Empty(content.Testimonials);
    }

    [Fact]
    public async Task AFailedFirstReadIsNotRetriedOnEveryRequest()
    {
        _storage.Failure = new HttpRequestException("The content container is unreachable.");

        await _reviews.GetAsync(Cancellation);
        await _reviews.GetAsync(Cancellation);

        Assert.Equal(1, _storage.Calls);
    }

    [Fact]
    public async Task ACallerWhoCancelsGetsACancellation()
    {
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();
        _storage.Failure = new TaskCanceledException("Cancelled.");

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _reviews.GetAsync(cancelled.Token));
    }
}
