using System.Text.Json;
using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class CatalogMapperTests
{
    [Fact]
    public void AppointmentServiceItemBecomesItsBookableVariations()
    {
        CatalogObject item = SquareFixture.ReadAs<SearchCatalogItemsResponse>("search-catalog-items.json").Items!.Single();

        BookableService service = Assert.Single(item.ToBookableServices());

        Assert.Equal("Men's haircut", service.Name);
        Assert.Equal("VARIATION0HAIRCUT000TEST", service.VariationId);
        Assert.Equal(1791077615792, service.VariationVersion);
        Assert.Equal(TimeSpan.FromMinutes(30), service.Duration);
        Assert.Equal(["TM_test-Barber01"], service.TeamMemberIds);
    }

    [Theory]
    [InlineData("\"available_for_booking\": true", "\"available_for_booking\": false")]
    [InlineData("\"product_type\": \"APPOINTMENTS_SERVICE\"", "\"product_type\": \"REGULAR\"")]
    [InlineData("\"is_deleted\": false,\n      \"present_at_all_locations\": true,\n      \"item_data\"", "\"is_deleted\": true,\n      \"present_at_all_locations\": true,\n      \"item_data\"")]
    [InlineData("\"variations\":", "\"unused_variations\":")]
    public void ItemsAndVariationsCustomersCantBookAreLeftOut(string squareValue, string replacement)
    {
        CatalogObject item = ReadCatalogItem(squareValue, replacement);

        Assert.Empty(item.ToBookableServices());
    }

    [Fact]
    public void ACatalogObjectThatIsNotAnItemHasNoBookableServices()
    {
        CatalogObject category = JsonSerializer.Deserialize<CatalogObject>("""{ "type": "CATEGORY", "id": "CATEGORY1" }""")!;

        Assert.Empty(category.ToBookableServices());
    }

    [Fact]
    public void AnItemWithoutANameHasAnEmptyServiceName()
    {
        CatalogObject item = ReadCatalogItem("\"name\": \"Men's haircut\",", string.Empty);

        Assert.Equal(string.Empty, Assert.Single(item.ToBookableServices()).Name);
    }

    [Fact]
    public void AVariationWithoutTeamMembersHasNone()
    {
        CatalogObject item = ReadCatalogItem("\"team_member_ids\":", "\"unused_team_member_ids\":");

        Assert.Empty(Assert.Single(item.ToBookableServices()).TeamMemberIds);
    }

    [Theory]
    [InlineData("\"version\": 1791077615792,")]
    [InlineData("\"service_duration\": 1800000,")]
    public void ABookableVariationWithoutARequiredFieldThrows(string squareField)
    {
        CatalogObject item = ReadCatalogItem(squareField, string.Empty);

        Assert.Throws<InvalidOperationException>(() => item.ToBookableServices());
    }

    private static CatalogObject ReadCatalogItem(string squareValue, string replacement)
    {
        string json = SquareFixture.ReadText("search-catalog-items.json").ReplaceLineEndings("\n");
        Assert.Contains(squareValue, json, StringComparison.Ordinal);

        return JsonSerializer.Deserialize<SearchCatalogItemsResponse>(json.Replace(squareValue, replacement, StringComparison.Ordinal))!.Items!.Single();
    }
}
