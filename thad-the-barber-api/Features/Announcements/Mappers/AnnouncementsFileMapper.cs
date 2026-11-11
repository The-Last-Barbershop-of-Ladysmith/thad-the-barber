using System.Globalization;
using System.Text.Json;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;

namespace ThadTheBarber.Api.Features.Announcements.Mappers;

/// <summary>
/// BR-33: reads <c>announcements.json</c> (<c>{ "items": [...] }</c>) leniently. A file of another shape has no
/// announcements, and an item without a title or valid dates is skipped, so one bad entry never hides the rest.
/// </summary>
public static class AnnouncementsFileMapper
{
    private const string ImageFolder = "announcements/";
    private const string DayFormat = "yyyy-MM-dd";

    public static List<Announcement> ToAnnouncements(this JsonElement file, MediaStorageSettings storage)
    {
        List<Announcement> announcements = [];
        if (file.ValueKind != JsonValueKind.Object
            || !file.TryGetProperty("items", out JsonElement items)
            || items.ValueKind != JsonValueKind.Array)
        {
            return announcements;
        }

        foreach (JsonElement item in items.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object && ToAnnouncement(item, storage) is Announcement announcement)
            {
                announcements.Add(announcement);
            }
        }

        return announcements;
    }

    /// <summary>
    /// The same rule as the UI's link kinds: a site path, https, tel: or mailto:. A path starting <c>//</c> or <c>/\</c> is
    /// another site, and a link with a control character (a tab or line break inside <c>//</c> is ignored by browsers) is refused.
    /// </summary>
    public static bool IsAllowedLink(string url)
    {
        if (url.Any(char.IsControl))
        {
            return false;
        }

        if (url.StartsWith('/'))
        {
            return url.Length == 1 || (url[1] != '/' && url[1] != '\\');
        }

        return url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || url.StartsWith("tel:", StringComparison.OrdinalIgnoreCase)
            || url.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase);
    }

    private static Announcement? ToAnnouncement(JsonElement item, MediaStorageSettings storage)
    {
        string? title = Text(item, "title");
        DateOnly? startDate = Day(item, "startDate");
        DateOnly? endDate = Day(item, "endDate");
        if (title is null || startDate is null || endDate is null || endDate < startDate)
        {
            return null;
        }

        return new Announcement(
            title,
            AnnouncementBodySanitizer.Clean(Text(item, "bodyHtml") ?? string.Empty),
            startDate.Value,
            endDate.Value,
            ToImage(item, storage),
            ToButtons(item)
        );
    }

    private static AnnouncementImage? ToImage(JsonElement item, MediaStorageSettings storage)
    {
        if (!item.TryGetProperty("image", out JsonElement image) || image.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        string? fileName = Text(image, "fileName");
        if (fileName is null)
        {
            return null;
        }

        AnnouncementImagePosition position = AnnouncementImagePosition.Right;
        if (string.Equals(Text(image, "position"), "left", StringComparison.OrdinalIgnoreCase))
        {
            position = AnnouncementImagePosition.Left;
        }

        return new AnnouncementImage(
            storage.GetMediaUrl(ImageFolder + Uri.EscapeDataString(fileName)),
            Text(image, "altText") ?? string.Empty,
            position
        );
    }

    private static List<AnnouncementButton> ToButtons(JsonElement item)
    {
        List<AnnouncementButton> buttons = [];
        if (!item.TryGetProperty("buttons", out JsonElement entries) || entries.ValueKind != JsonValueKind.Array)
        {
            return buttons;
        }

        foreach (JsonElement entry in entries.EnumerateArray())
        {
            if (entry.ValueKind == JsonValueKind.Object && ToButton(entry) is AnnouncementButton button)
            {
                buttons.Add(button);
            }
        }

        return buttons;
    }

    /// <summary>A button without a label, or with a link <see cref="IsAllowedLink"/> rejects, is dropped; an unknown variant is outlined.</summary>
    private static AnnouncementButton? ToButton(JsonElement entry)
    {
        string? label = Text(entry, "label");
        string? url = Text(entry, "url");
        if (label is null || url is null || !IsAllowedLink(url))
        {
            return null;
        }

        AnnouncementButtonVariant variant = AnnouncementButtonVariant.Outlined;
        if (Enum.TryParse(Text(entry, "variant"), ignoreCase: true, out AnnouncementButtonVariant named)
            && Enum.IsDefined(named))
        {
            variant = named;
        }

        return new AnnouncementButton(label, url, variant);
    }

    private static string? Text(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out JsonElement value) || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        string text = value.GetString()!.Trim();
        if (text.Length == 0)
        {
            return null;
        }

        return text;
    }

    /// <summary>A real calendar day as <c>YYYY-MM-DD</c> (so <c>2026-02-30</c> is rejected), or null.</summary>
    private static DateOnly? Day(JsonElement parent, string name)
    {
        string? text = Text(parent, name);
        bool isDay = DateOnly.TryParseExact(text, DayFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly day);
        if (isDay)
        {
            return day;
        }

        return null;
    }
}
