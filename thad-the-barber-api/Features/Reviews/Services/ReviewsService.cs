using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Reviews.Mappers;
using ThadTheBarber.Api.Features.Reviews.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Reviews.Services;

/// <summary>
/// The reviews and listing rating in the private content container's <c>reviews.json</c>, kept by
/// <see cref="StaleCache"/> until a change in the container marks them stale (<see cref="MarkStale"/>). A missing file
/// has no reviews. A file that can't be read or isn't a reviews file keeps serving the last good copy, and is logged and
/// served as no reviews when there is none yet, so the page hides the section. Google's reviews API replaces this file
/// as the source in #37, behind the same method.
/// </summary>
public sealed class ReviewsService(
    IMediaStorage storage,
    StaleCache cache,
    IOptions<MediaStorageSettings> settings)
{
    public const string CacheKey = "media:reviews";

    public const string FileName = "reviews.json";

    public Task<ReviewsContent> GetAsync(CancellationToken cancellationToken) =>
        cache.GetOrRefreshAsync(CacheKey, () => FetchAsync(cancellationToken), ReviewsContent.Empty, cancellationToken);

    public void MarkStale() => cache.MarkStale<ReviewsContent>(CacheKey);

    private async Task<ReviewsContent> FetchAsync(CancellationToken cancellationToken)
    {
        string? text = await storage.ReadTextAsync(settings.Value.ContentContainerName, FileName, cancellationToken);
        if (text is null)
        {
            return ReviewsContent.Empty;
        }

        using JsonDocument file = JsonDocument.Parse(text);
        return file.RootElement.ToReviewsContent();
    }
}
