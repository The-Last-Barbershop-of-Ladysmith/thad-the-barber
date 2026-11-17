using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Announcements.Exceptions;
using ThadTheBarber.Api.Features.Announcements.Mappers;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Announcements.Services;

/// <summary>
/// The admin's view of <c>announcements.json</c>: every item whatever its dates, and saving the whole list back. The
/// public list (<see cref="AnnouncementsService"/>) is cleared from its cache on every save. Unlike the public list, a
/// file that can't be read or isn't valid JSON is an error here, not an empty list, so a save never wipes what an
/// outage hid. A save checks the list strictly (the request's validation) and cleans each <c>bodyHtml</c> before
/// storing it, so the file stays as clean as what the public list returns.
/// </summary>
public sealed class AdminAnnouncementsService(
    IMediaStorage storage,
    AnnouncementsService announcements,
    IOptions<MediaStorageSettings> settings)
{
    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        WriteIndented = true,
    };

    public async Task<List<AdminAnnouncement>> GetAllAsync(CancellationToken cancellationToken)
    {
        MediaStorageSettings media = settings.Value;
        List<Announcement> items = await ReadAsync(media, cancellationToken);
        DateOnly today = await announcements.GetShopTodayAsync(cancellationToken);
        return items.Select(item => ToAdminAnnouncement(item, today)).ToList();
    }

    public async Task<List<AdminAnnouncement>> SaveAsync(List<AnnouncementInput> items, CancellationToken cancellationToken)
    {
        List<AnnouncementInput> cleaned = items
            .Select(item => item with
            {
                Title = item.Title.Trim(),
                BodyHtml = AnnouncementBodySanitizer.Clean(item.BodyHtml ?? string.Empty),
                Image = item.Image is null ? null : item.Image with { AltText = item.Image.AltText.Trim() },
                Buttons = (item.Buttons ?? []).Select(button => button with { Label = button.Label.Trim(), Url = button.Url.Trim() }).ToList(),
            })
            .ToList();
        string file = JsonSerializer.Serialize(new { items = cleaned }, FileOptions);
        try
        {
            await storage.WriteTextAsync(settings.Value.ContentContainerName, AnnouncementsService.FileName, file, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new AnnouncementsUnavailableException("The announcements couldn't be saved.", exception);
        }

        announcements.MarkStale();
        return await GetAllAsync(cancellationToken);
    }

    private async Task<List<Announcement>> ReadAsync(MediaStorageSettings media, CancellationToken cancellationToken)
    {
        try
        {
            string? text = await storage.ReadTextAsync(media.ContentContainerName, AnnouncementsService.FileName, cancellationToken);
            if (text is null)
            {
                return [];
            }

            using JsonDocument file = JsonDocument.Parse(text);
            return file.RootElement.ToAnnouncements(media);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new AnnouncementsUnavailableException("The announcements file couldn't be read.", exception);
        }
    }

    private static AdminAnnouncement ToAdminAnnouncement(Announcement item, DateOnly today)
    {
        AdminAnnouncementStatus status = AdminAnnouncementStatus.Showing;
        if (today < item.StartDate)
        {
            status = AdminAnnouncementStatus.Scheduled;
        }
        else if (today > item.EndDate)
        {
            status = AdminAnnouncementStatus.Ended;
        }

        return new AdminAnnouncement(
            item.Title,
            item.BodyHtml,
            item.StartDate,
            item.EndDate,
            item.Image is null ? null : ToAdminImage(item.Image),
            item.Buttons,
            status
        );
    }

    /// <summary>The public image has only its URL, whose last segment is the stored file name.</summary>
    private static AdminAnnouncementImage ToAdminImage(AnnouncementImage image)
    {
        string fileName = Uri.UnescapeDataString(image.Src[(image.Src.LastIndexOf('/') + 1)..]);
        return new AdminAnnouncementImage(fileName, image.Alt, image.Position, image.Src);
    }
}
