using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>Turns an announcement into text-message wording, and names its send record.</summary>
public static partial class AnnouncementTextComposer
{
    public const string OptOutNotice = "Reply STOP to opt out.";

    private const int MaxBodyLength = 240;

    /// <summary>"Shop: Title. First part of the body… https://site Reply STOP to opt out."</summary>
    public static string Compose(string shopName, string title, string? bodyHtml, string siteUrl)
    {
        string body = ToPlainText(bodyHtml ?? string.Empty);
        if (body.Length > MaxBodyLength)
        {
            body = body[..MaxBodyLength].TrimEnd() + "…";
        }

        string headline = title.Trim().TrimEnd('.', '!', '?');
        string lead = body.Length > 0 ? $"{shopName}: {headline}. {body}" : $"{shopName}: {headline}.";
        return $"{lead} {siteUrl.TrimEnd('/')} {OptOutNotice}";
    }

    /// <summary>The admin's wording with the opt-out line added when it has none, since every text must carry one.</summary>
    public static string EnsureOptOutNotice(string message)
    {
        string trimmed = message.Trim();
        return trimmed.Contains("STOP", StringComparison.OrdinalIgnoreCase) ? trimmed : $"{trimmed} {OptOutNotice}";
    }

    /// <summary>The send record's id: the first day and the title, so the same announcement is the same id however it was edited otherwise.</summary>
    public static string SendId(DateOnly startDate, string title)
    {
        string normalized = $"{startDate:yyyy-MM-dd}|{WhitespaceRun().Replace(title.Trim(), " ").ToLowerInvariant()}";
        return $"{startDate:yyyyMMdd}-{Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(normalized)))[..12]}";
    }

    public static string ToPlainText(string html)
    {
        string withBreaks = BlockEnd().Replace(html, " ");
        string withoutTags = Tag().Replace(withBreaks, string.Empty);
        return WhitespaceRun().Replace(WebUtility.HtmlDecode(withoutTags), " ").Trim();
    }

    [GeneratedRegex(@"</(p|li|h[1-6]|div)>|<br\s*/?>", RegexOptions.IgnoreCase)]
    private static partial Regex BlockEnd();

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex Tag();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRun();
}
