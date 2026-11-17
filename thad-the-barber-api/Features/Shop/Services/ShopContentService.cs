using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Services;
using ThadTheBarber.Api.Features.Shop.Exceptions;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Shop.Services;

/// <summary>
/// The owner's own shop info in the private content container's <c>shop-info.json</c> (<c>{ "notice": "...",
/// "isNoticeShown": true }</c>), kept by <see cref="StaleCache"/> until a save or a change in the container marks it
/// stale. A missing file, or one that can't be read yet, is <see cref="ShopNoticeSettings.Default"/>: Square's
/// description shows, so the booking page never loses its notice to an outage. The admin read (<see cref="ReadAsync"/>)
/// is strict instead: a file that can't be read or isn't valid JSON is an error, so a save never overwrites what an
/// outage hid.
/// </summary>
public sealed class ShopContentService(
    IMediaStorage storage,
    StaleCache cache,
    IOptions<MediaStorageSettings> settings)
{
    public const string CacheKey = "media:shop-info";

    public const string FileName = "shop-info.json";

    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public Task<ShopNoticeSettings> GetAsync(CancellationToken cancellationToken) =>
        cache.GetOrRefreshAsync(CacheKey, () => FetchAsync(cancellationToken), ShopNoticeSettings.Default, cancellationToken);

    public void MarkStale() => cache.MarkStale<ShopNoticeSettings>(CacheKey);

    /// <summary>What is saved, bypassing the cache; 503 <c>shop_info_unavailable</c> when it can't be read.</summary>
    public async Task<ShopNoticeSettings> ReadAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await FetchAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new ShopInfoUnavailableException("The shop info file couldn't be read.", exception);
        }
    }

    /// <summary>Replaces the saved settings; a blank notice is saved as none, so Square's description shows.</summary>
    public async Task SaveAsync(ShopInfoSaveRequest request, CancellationToken cancellationToken)
    {
        string? notice = string.IsNullOrWhiteSpace(request.Notice) ? null : request.Notice.Trim();
        string file = JsonSerializer.Serialize(new ShopNoticeSettings(notice, request.IsNoticeShown), FileOptions);
        try
        {
            await storage.WriteTextAsync(settings.Value.ContentContainerName, FileName, file, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new ShopInfoUnavailableException("The shop info couldn't be saved.", exception);
        }

        MarkStale();
    }

    private async Task<ShopNoticeSettings> FetchAsync(CancellationToken cancellationToken)
    {
        string? text = await storage.ReadTextAsync(settings.Value.ContentContainerName, FileName, cancellationToken);
        if (text is null)
        {
            return ShopNoticeSettings.Default;
        }

        using JsonDocument file = JsonDocument.Parse(text);
        JsonElement root = file.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
        {
            return ShopNoticeSettings.Default;
        }

        string? notice = null;
        if (root.TryGetProperty("notice", out JsonElement noticeElement) && noticeElement.ValueKind == JsonValueKind.String)
        {
            notice = noticeElement.GetString()?.Trim();
            if (string.IsNullOrEmpty(notice))
            {
                notice = null;
            }
        }

        bool isNoticeShown = !root.TryGetProperty("isNoticeShown", out JsonElement shownElement)
            || shownElement.ValueKind != JsonValueKind.False;
        return new ShopNoticeSettings(notice, isNoticeShown);
    }
}
