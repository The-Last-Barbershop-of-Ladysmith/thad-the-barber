using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Announcements.Mappers;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Announcements.Services;

/// <summary>
/// The announcements in the private content container's <c>announcements.json</c>. The valid items are kept by
/// <see cref="StaleCache"/> until a change in the container marks them stale (<see cref="MarkStale"/>); which ones show
/// is decided on every request, because the day changes (BR-30): from the start day through the end day, on the shop's
/// calendar from Square's timezone, so a post that starts tomorrow is never sent to the browser. A missing or broken
/// file, or storage that can't be read before any copy exists, is logged where it's unexpected and served as no
/// announcements, so the page hides the section (BR-32).
/// </summary>
public sealed partial class AnnouncementsService(
    IMediaStorage storage,
    StaleCache cache,
    ISquareService square,
    TimeProvider time,
    IOptions<MediaStorageSettings> settings,
    ILogger<AnnouncementsService> logger)
{
    public const string CacheKey = "media:announcements";

    private const string FileName = "announcements.json";

    public async Task<List<Announcement>> GetActiveAsync(CancellationToken cancellationToken)
    {
        List<Announcement> announcements = await GetAllAsync(cancellationToken);
        if (announcements.Count == 0)
        {
            return announcements;
        }

        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        DateOnly today = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone).ToLocalDate(time.GetUtcNow());
        return announcements
            .Where(announcement => announcement.StartDate <= today && today <= announcement.EndDate)
            .ToList();
    }

    public void MarkStale() => cache.MarkStale<List<Announcement>>(CacheKey);

    private async Task<List<Announcement>> GetAllAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await cache.GetOrRefreshAsync(CacheKey, () => FetchAsync(cancellationToken), cancellationToken);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            LogUnreadable(logger, exception);
            return [];
        }
    }

    private async Task<List<Announcement>> FetchAsync(CancellationToken cancellationToken)
    {
        MediaStorageSettings media = settings.Value;
        string? text = await storage.ReadTextAsync(media.ContentContainerName, FileName, cancellationToken);
        if (text is null)
        {
            return [];
        }

        try
        {
            using JsonDocument file = JsonDocument.Parse(text);
            return file.RootElement.ToAnnouncements(media);
        }
        catch (JsonException exception)
        {
            LogBrokenFile(logger, exception);
            return [];
        }
    }

    [LoggerMessage(EventName = "AnnouncementsUnreadable", Level = LogLevel.Warning, Message = "Couldn't read announcements.json; serving no announcements.")]
    private static partial void LogUnreadable(ILogger logger, Exception exception);

    [LoggerMessage(EventName = "AnnouncementsFileBroken", Level = LogLevel.Warning, Message = "announcements.json isn't valid JSON; serving no announcements.")]
    private static partial void LogBrokenFile(ILogger logger, Exception exception);
}
