using Ganss.Xss;

namespace ThadTheBarber.Api.Features.Announcements.Mappers;

/// <summary>
/// Cleans an announcement's <c>bodyHtml</c> before it leaves the API, so a bad edit to <c>announcements.json</c> (or a
/// compromised uploader) can't serve script to visitors, whatever the page does with it. Links keep the same schemes as
/// buttons (https, tel, mailto) and site paths; formatting tags stay.
/// </summary>
public static class AnnouncementBodySanitizer
{
    public static string Clean(string bodyHtml)
    {
        HtmlSanitizer sanitizer = new();
        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.Add("https");
        sanitizer.AllowedSchemes.Add("tel");
        sanitizer.AllowedSchemes.Add("mailto");
        return sanitizer.Sanitize(bodyHtml);
    }
}
