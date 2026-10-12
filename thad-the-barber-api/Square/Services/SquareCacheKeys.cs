namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// <see cref="SquareCache"/> keys, shared by <see cref="SquareService"/>, which fills the entries, and the webhook,
/// which marks them stale when Square reports a change.
/// </summary>
public static class SquareCacheKeys
{
    public const string ShopDetails = "square:shop-details";
    public const string BookingProfilePrefix = "square:booking-profile:";
    public const string BookableServices = "square:bookable-services";
}
