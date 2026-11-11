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
/// calendar from Square's timezone, so a post that starts tomorrow is never sent to the browser. A missing file has no
/// announcements. A file that can't be read or isn't valid JSON keeps serving the last good copy, and is logged and
/// served as no announcements when there is none yet, as is a shop clock Square can't give, so the page hides the
/// section (BR-32).
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

        DateOnly today;
        try
        {
            ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
            today = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone).ToLocalDate(time.GetUtcNow());
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            LogShopClockUnavailable(logger, exception);
            return [];
        }

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

        using JsonDocument file = JsonDocument.Parse(text);
        return file.RootElement.ToAnnouncements(media);
    }

    [LoggerMessage(EventName = "AnnouncementsUnreadable", Level = LogLevel.Warning, Message = "Couldn't read or parse announcements.json; serving the last good copy, or none.")]
    private static partial void LogUnreadable(ILogger logger, Exception exception);

    [LoggerMessage(EventName = "AnnouncementsShopClockUnavailable", Level = LogLevel.Warning, Message = "Couldn't get the shop's timezone; serving no announcements.")]
    private static partial void LogShopClockUnavailable(ILogger logger, Exception exception);
}
