using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Reviews.Configuration;
using ThadTheBarber.Api.Features.Reviews.Mappers;
using ThadTheBarber.Api.Features.Reviews.Models;

namespace ThadTheBarber.Api.Features.Reviews.Services;

/// <summary>
/// The reviews and listing rating from <c>content/reviews.json</c> in the media container, kept for
/// <see cref="ReviewsSettings.CacheFor"/> and shared by every visitor. A missing, unreachable or unreadable file is
/// logged and served as no reviews (the UI hides the section) and kept for the same time. Google's reviews API replaces
/// this file as the source in #37, behind the same method.
/// </summary>
public sealed partial class ReviewsService(
    IHttpClientFactory httpClients,
    TimeProvider time,
    IOptions<ReviewsSettings> settings,
    ILogger<ReviewsService> logger) : IDisposable
{
    public const string HttpClientName = "ReviewsFile";

    private const string FilePath = "content/reviews.json";

    private readonly SemaphoreSlim _readLock = new(1, 1);
    private ReviewsContent _content = ReviewsContent.Empty;
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public async Task<ReviewsContent> GetAsync(CancellationToken cancellationToken)
    {
        await _readLock.WaitAsync(cancellationToken);
        try
        {
            DateTimeOffset now = time.GetUtcNow();
            if (now >= _expiresAt)
            {
                _content = await ReadFileAsync(cancellationToken);
                _expiresAt = now + settings.Value.CacheFor;
            }

            return _content;
        }
        finally
        {
            _readLock.Release();
        }
    }

    public void Dispose() => _readLock.Dispose();

    private async Task<ReviewsContent> ReadFileAsync(CancellationToken cancellationToken)
    {
        try
        {
            using HttpClient http = httpClients.CreateClient(HttpClientName);
            using HttpResponseMessage response = await http.GetAsync(FilePath, cancellationToken);
            response.EnsureSuccessStatusCode();
            JsonElement file = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            return file.ToReviewsContent();
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            LogFileUnreadable(logger, exception);
            return ReviewsContent.Empty;
        }
    }

    [LoggerMessage(EventName = "ReviewsFileUnreadable", Level = LogLevel.Warning, Message = "Couldn't read content/reviews.json; serving no reviews.")]
    private static partial void LogFileUnreadable(ILogger logger, Exception exception);
}
