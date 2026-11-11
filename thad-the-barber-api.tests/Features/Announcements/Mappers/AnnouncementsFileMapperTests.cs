using System.Text.Json;
using ThadTheBarber.Api.Features.Announcements.Mappers;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;

namespace ThadTheBarber.Api.Tests.Features.Announcements.Mappers;

public sealed class AnnouncementsFileMapperTests
{
    private static readonly MediaStorageSettings storage = new()
    {
        AccountName = "fakeaccount",
        MediaContainerName = "media-fake",
        ContentContainerName = "content-fake",
    };

    private static List<Announcement> Map(string json) => JsonDocument.Parse(json).RootElement.ToAnnouncements(storage);

    private static string Items(params string[] items) => $$"""{ "items": [{{string.Join(",", items)}}] }""";

    private const string ValidItem = """{ "title": "Made-up post", "startDate": "2026-10-01", "endDate": "2026-10-31" }""";

    [Fact]
    public void AValidItemKeepsItsTrimmedTextAndDays()
    {
        Announcement announcement = Assert.Single(Map(Items("""
            { "title": "  Closed Monday  ", "bodyHtml": " <p>Back Tuesday</p> ", "startDate": "2026-10-01", "endDate": "2026-10-31" }
            """)));

        Assert.Equal("Closed Monday", announcement.Title);
        Assert.Equal("<p>Back Tuesday</p>", announcement.BodyHtml);
        Assert.Equal(new DateOnly(2026, 10, 1), announcement.StartDate);
        Assert.Equal(new DateOnly(2026, 10, 31), announcement.EndDate);
        Assert.Null(announcement.Image);
        Assert.Empty(announcement.Buttons);
    }

    [Fact]
    public void ABodyIsOptional()
    {
        Assert.Equal(string.Empty, Assert.Single(Map(Items(ValidItem))).BodyHtml);
    }

    [Fact]
    public void ADayOnlyCountsWhenItIsARealCalendarDayInTheFileFormat()
    {
        List<Announcement> announcements = Map(Items(
            """{ "title": "Impossible day", "startDate": "2026-02-30", "endDate": "2026-03-05" }""",
            """{ "title": "Wrong format", "startDate": "10/01/2026", "endDate": "2026-10-31" }""",
            """{ "title": "Number, not text", "startDate": 20261001, "endDate": "2026-10-31" }""",
            """{ "title": "No end", "startDate": "2026-10-01" }"""
        ));

        Assert.Empty(announcements);
    }

    [Fact]
    public void AnItemThatEndsBeforeItStartsIsSkippedButOneDayLongIsKept()
    {
        List<Announcement> announcements = Map(Items(
            """{ "title": "Backwards", "startDate": "2026-10-10", "endDate": "2026-10-09" }""",
            """{ "title": "One day", "startDate": "2026-10-10", "endDate": "2026-10-10" }"""
        ));

        Assert.Equal(["One day"], announcements.Select(announcement => announcement.Title));
    }

    [Theory]
    [InlineData("""{ "startDate": "2026-10-01", "endDate": "2026-10-31" }""")]
    [InlineData("""{ "title": "   ", "startDate": "2026-10-01", "endDate": "2026-10-31" }""")]
    [InlineData("""{ "title": 7, "startDate": "2026-10-01", "endDate": "2026-10-31" }""")]
    [InlineData("42")]
    [InlineData("\"not an item\"")]
    [InlineData("null")]
    public void AnItemWithoutATitleOrNotAnObjectIsSkippedWithoutHidingTheRest(string badItem)
    {
        List<Announcement> announcements = Map(Items(badItem, ValidItem));

        Assert.Equal(["Made-up post"], announcements.Select(announcement => announcement.Title));
    }

    [Theory]
    [InlineData("""{ "items": "none" }""")]
    [InlineData("""{ "other": [] }""")]
    [InlineData("""[]""")]
    [InlineData("\"text\"")]
    [InlineData("null")]
    public void AFileOfAnotherShapeHasNoAnnouncements(string json)
    {
        Assert.Empty(Map(json));
    }

    [Fact]
    public void AnImageLoadsFromTheMediaContainerWithItsNameEscapedAndTheRightByDefault()
    {
        Announcement announcement = Assert.Single(Map(Items("""
            { "title": "With image", "startDate": "2026-10-01", "endDate": "2026-10-31",
              "image": { "fileName": "spring cut #1.webp", "altText": " A fresh cut " } }
            """)));

        Assert.Equal("https://fakeaccount.blob.core.windows.net/media-fake/announcements/spring%20cut%20%231.webp", announcement.Image!.Src);
        Assert.Equal("A fresh cut", announcement.Image.Alt);
        Assert.Equal(AnnouncementImagePosition.Right, announcement.Image.Position);
    }

    [Theory]
    [InlineData("left", AnnouncementImagePosition.Left)]
    [InlineData("LEFT", AnnouncementImagePosition.Left)]
    [InlineData("right", AnnouncementImagePosition.Right)]
    [InlineData("sideways", AnnouncementImagePosition.Right)]
    public void AnImagePositionIsLeftOnlyWhenTheFileSaysLeft(string position, AnnouncementImagePosition expected)
    {
        Announcement announcement = Assert.Single(Map(Items($$"""
            { "title": "Positioned", "startDate": "2026-10-01", "endDate": "2026-10-31",
              "image": { "fileName": "a.jpg", "position": "{{position}}" } }
            """)));

        Assert.Equal(expected, announcement.Image!.Position);
    }

    [Theory]
    [InlineData("""{ "altText": "No file name" }""")]
    [InlineData("""{ "fileName": "   " }""")]
    [InlineData("\"a.jpg\"")]
    public void AnImageWithoutAFileNameIsLeftOut(string image)
    {
        Announcement announcement = Assert.Single(Map(Items($$"""
            { "title": "Imageless", "startDate": "2026-10-01", "endDate": "2026-10-31", "image": {{image}} }
            """)));

        Assert.Null(announcement.Image);
    }

    [Fact]
    public void AButtonNeedsALabelAndAnAllowedLinkAndAnUnknownVariantIsOutlined()
    {
        Announcement announcement = Assert.Single(Map(Items("""
            { "title": "With buttons", "startDate": "2026-10-01", "endDate": "2026-10-31",
              "buttons": [
                { "label": "Book", "url": "/book", "variant": "primary" },
                { "label": "Call", "url": "tel:+15550100", "variant": "TEXT" },
                { "label": "Odd look", "url": "https://example.test/x", "variant": "neon" },
                { "label": "No look", "url": "mailto:hi@example.test" },
                { "label": "Script", "url": "javascript:alert(1)" },
                { "url": "/book" },
                { "label": "No link" },
                "not a button"
              ] }
            """)));

        Assert.Equal(
            [
                new AnnouncementButton("Book", "/book", AnnouncementButtonVariant.Primary),
                new AnnouncementButton("Call", "tel:+15550100", AnnouncementButtonVariant.Text),
                new AnnouncementButton("Odd look", "https://example.test/x", AnnouncementButtonVariant.Outlined),
                new AnnouncementButton("No look", "mailto:hi@example.test", AnnouncementButtonVariant.Outlined),
            ],
            announcement.Buttons);
    }

    [Theory]
    [InlineData("/", true)]
    [InlineData("/book#hours", true)]
    [InlineData("https://example.test", true)]
    [InlineData("HTTPS://EXAMPLE.TEST", true)]
    [InlineData("tel:+15550100", true)]
    [InlineData("mailto:hi@example.test", true)]
    [InlineData("//evil.test", false)]
    [InlineData("/\\evil.test", false)]
    [InlineData("http://example.test", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("book", false)]
    public void OnlyASitePathHttpsTelAndMailtoLinksAreAllowed(string url, bool isAllowed)
    {
        Assert.Equal(isAllowed, AnnouncementsFileMapper.IsAllowedLink(url));
    }
}
