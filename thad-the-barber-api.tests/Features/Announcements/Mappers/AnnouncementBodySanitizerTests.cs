using ThadTheBarber.Api.Features.Announcements.Mappers;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Mappers;

public sealed class AnnouncementBodySanitizerTests
{
    [Theory]
    [InlineData("<h2>Big news</h2>")]
    [InlineData("<h3>Smaller news</h3>")]
    [InlineData("<p><strong>a</strong><em>b</em><u>c</u><s>d</s></p>")]
    [InlineData("<p><mark>highlighted</mark></p>")]
    [InlineData("<p>x<sup>2</sup> and x<sub>2</sub></p>")]
    [InlineData("<ul><li>one</li></ul><ol><li>two</li></ol>")]
    [InlineData("<blockquote><p>said</p></blockquote>")]
    [InlineData("<p align=\"center\">centred</p>")]
    [InlineData("<h2 align=\"right\">right</h2>")]
    public void EveryFormatTheEditorsToolbarMakesSurvives(string html)
    {
        Assert.Equal(html, AnnouncementBodySanitizer.Clean(html));
    }

    [Fact]
    public void AScriptAndAnEventHandlerDoNot()
    {
        string cleaned = AnnouncementBodySanitizer.Clean("<p onclick=\"steal()\">hi</p><script>steal()</script>");

        Assert.Equal("<p>hi</p>", cleaned);
    }
}
