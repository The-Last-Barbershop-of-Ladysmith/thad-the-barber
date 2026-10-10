using FsCheck.Xunit;
using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Generators;
using SquareDayOfWeek = Square.DayOfWeek;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class LocationMapperTests
{
    [Fact]
    public void LocationBecomesShopDetails()
    {
        ShopDetails details = ReadLocation().ToShopDetails();

        Assert.Equal("LOCATION0TEST", details.LocationId);
        Assert.Equal("O'Neil & Søn Barbershop", details.Name);
        Assert.Equal("+15550100199", details.Phone);
        Assert.Equal("America/New_York", details.TimeZone);
        Assert.Equal(
            new ShopAddress(
                "100 Example St Ste #2",
                "Winston-Salem",
                "NC",
                "27101-0001"
            ),
            details.Address);
        Assert.Equal(
            [
                new OpeningPeriod(
                    System.DayOfWeek.Saturday,
                    new TimeOnly(9, 30),
                    new TimeOnly(12, 0)
                ),
                new OpeningPeriod(
                    System.DayOfWeek.Sunday,
                    new TimeOnly(10, 0),
                    new TimeOnly(16, 0)
                ),
                new OpeningPeriod(
                    System.DayOfWeek.Saturday,
                    new TimeOnly(13, 0),
                    new TimeOnly(19, 45)
                ),
            ],
            details.Hours);
        Assert.Equal("❗Important: read before booking❗\n\nQuestions? Text 555-010-0199.\n\nPrices stay the same for now 💈\n", details.Description);
    }

    [Theory]
    [InlineData("+1 (555) 010-0199", "+15550100199")]
    [InlineData("555.010.0199", "+15550100199")]
    [InlineData("+44 20 7946 0958", "+442079460958")]
    public void LocationPhoneBecomesE164(string squarePhone, string e164)
    {
        Location location = ReadLocation() with { PhoneNumber = squarePhone };

        Assert.Equal(e164, location.ToShopDetails().Phone);
    }

    [Property(Arbitrary = new[] { typeof(PhoneArbitraries) })]
    public void OnlyAPhonesDigitsMatter(FormattedPhone phone)
    {
        Location location = ReadLocation();
        string formatted = (location with { PhoneNumber = phone.Text }).ToShopDetails().Phone;

        Assert.Equal((location with { PhoneNumber = phone.Digits }).ToShopDetails().Phone, formatted);
        Assert.Matches("^\\+[0-9]+$", formatted);
        Assert.EndsWith(phone.Digits, formatted, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  \n")]
    public void ABlankDescriptionMeansNone(string description)
    {
        Location location = ReadLocation() with { Description = description };

        Assert.Null(location.ToShopDetails().Description);
    }

    [Fact]
    public void ALocationWithoutABusinessNameUsesItsName()
    {
        Location location = ReadLocation() with { BusinessName = null };

        Assert.Equal("Test Location", location.ToShopDetails().Name);
    }

    [Fact]
    public void ALocationWithoutBusinessHoursHasNoOpeningPeriods()
    {
        Location location = ReadLocation() with { BusinessHours = null };

        Assert.Empty(location.ToShopDetails().Hours);
    }

    [Theory]
    [InlineData("SUN", System.DayOfWeek.Sunday)]
    [InlineData("MON", System.DayOfWeek.Monday)]
    [InlineData("TUE", System.DayOfWeek.Tuesday)]
    [InlineData("WED", System.DayOfWeek.Wednesday)]
    [InlineData("THU", System.DayOfWeek.Thursday)]
    [InlineData("FRI", System.DayOfWeek.Friday)]
    [InlineData("SAT", System.DayOfWeek.Saturday)]
    public void SquareDaysBecomeDaysOfTheWeek(string squareDay, System.DayOfWeek day)
    {
        Location location = WithOnePeriod(ReadLocation(), SquareDayOfWeek.FromCustom(squareDay));

        Assert.Equal(day, Assert.Single(location.ToShopDetails().Hours).Day);
    }

    [Fact]
    public void AnUnknownSquareDayThrows()
    {
        Location location = WithOnePeriod(ReadLocation(), SquareDayOfWeek.FromCustom("HOLIDAY"));

        Assert.Throws<InvalidOperationException>(location.ToShopDetails);
    }

    [Fact]
    public void APeriodWithoutADayThrows()
    {
        Location location = WithOnePeriod(ReadLocation(), null);

        Assert.Throws<InvalidOperationException>(location.ToShopDetails);
    }

    [Theory]
    [InlineData("Id")]
    [InlineData("Name")]
    [InlineData("PhoneNumber")]
    [InlineData("Timezone")]
    [InlineData("Address")]
    [InlineData("AddressLine1")]
    [InlineData("Locality")]
    [InlineData("AdministrativeDistrictLevel1")]
    [InlineData("PostalCode")]
    [InlineData("StartLocalTime")]
    [InlineData("EndLocalTime")]
    public void ALocationWithoutARequiredFieldThrows(string field)
    {
        Location location = WithoutField(ReadLocation(), field);

        Assert.Throws<InvalidOperationException>(location.ToShopDetails);
    }

    private static Location ReadLocation() => SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location!;

    private static Location WithOnePeriod(Location location, SquareDayOfWeek? day) => location with
    {
        BusinessHours = new BusinessHours
        {
            Periods =
            [
                new BusinessHoursPeriod
                {
                    DayOfWeek = day,
                    StartLocalTime = "10:00:00",
                    EndLocalTime = "16:00:00",
                },
            ],
        },
    };

    private static Location WithoutField(Location location, string field)
    {
        BusinessHoursPeriod period = location.BusinessHours!.Periods!.First();

        return field switch
        {
            "Id" => location with { Id = null },
            "Name" => location with { BusinessName = null, Name = null },
            "PhoneNumber" => location with { PhoneNumber = null },
            "Timezone" => location with { Timezone = null },
            "Address" => location with { Address = null },
            "AddressLine1" => location with { Address = location.Address! with { AddressLine1 = null } },
            "Locality" => location with { Address = location.Address! with { Locality = null } },
            "AdministrativeDistrictLevel1" => location with { Address = location.Address! with { AdministrativeDistrictLevel1 = null } },
            "PostalCode" => location with { Address = location.Address! with { PostalCode = null } },
            "StartLocalTime" => location with { BusinessHours = new BusinessHours { Periods = [period with { StartLocalTime = null }] } },
            "EndLocalTime" => location with { BusinessHours = new BusinessHours { Periods = [period with { EndLocalTime = null }] } },
            _ => throw new ArgumentOutOfRangeException(nameof(field), field, "No such Square location field."),
        };
    }
}
