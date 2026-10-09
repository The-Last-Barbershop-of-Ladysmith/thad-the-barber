using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Models;
using SquareDay = Square.DayOfWeek.Values;

namespace ThadTheBarber.Api.Square.Mappers;

public static class LocationMapper
{
    public static ShopDetails ToShopDetails(this Location location) => new(
        location.Id ?? throw MissingField(nameof(Location.Id)),
        location.BusinessName ?? location.Name ?? throw MissingField(nameof(Location.BusinessName)),
        ToE164Phone(location.PhoneNumber ?? throw MissingField(nameof(Location.PhoneNumber))),
        location.Timezone ?? throw MissingField(nameof(Location.Timezone)),
        ToShopAddress(location.Address ?? throw MissingField(nameof(Location.Address))),
        [.. location.BusinessHours?.Periods?.Select(ToOpeningPeriod) ?? []],
        location.Description,
        location.InstagramUsername,
        location.FacebookUrl
    );

    /// <summary>Square keeps the number as typed in the Dashboard, e.g. <c>+1 540-621-2143</c>; 10 digits are US.</summary>
    private static string ToE164Phone(string phone)
    {
        string digits = string.Concat(phone.Where(char.IsAsciiDigit));
        if (digits.Length == 10)
        {
            return $"+1{digits}";
        }

        return $"+{digits}";
    }

    private static ShopAddress ToShopAddress(Address address) => new(
        address.AddressLine1 ?? throw MissingField(nameof(Address.AddressLine1)),
        address.Locality ?? throw MissingField(nameof(Address.Locality)),
        address.AdministrativeDistrictLevel1 ?? throw MissingField(nameof(Address.AdministrativeDistrictLevel1)),
        address.PostalCode ?? throw MissingField(nameof(Address.PostalCode))
    );

    private static OpeningPeriod ToOpeningPeriod(BusinessHoursPeriod period) => new(
        period.DayOfWeek?.Value switch
        {
            SquareDay.Sun => System.DayOfWeek.Sunday,
            SquareDay.Mon => System.DayOfWeek.Monday,
            SquareDay.Tue => System.DayOfWeek.Tuesday,
            SquareDay.Wed => System.DayOfWeek.Wednesday,
            SquareDay.Thu => System.DayOfWeek.Thursday,
            SquareDay.Fri => System.DayOfWeek.Friday,
            SquareDay.Sat => System.DayOfWeek.Saturday,
            var day => throw new InvalidOperationException($"Square returned an unknown day of week '{day}'."),
        },
        TimeOnly.Parse(period.StartLocalTime ?? throw MissingField(nameof(BusinessHoursPeriod.StartLocalTime)), CultureInfo.InvariantCulture),
        TimeOnly.Parse(period.EndLocalTime ?? throw MissingField(nameof(BusinessHoursPeriod.EndLocalTime)), CultureInfo.InvariantCulture)
    );

    private static InvalidOperationException MissingField(string field) => new($"The Square location has no {field}.");
}
