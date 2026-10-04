namespace ThadTheBarber.Api.Square.Models;

/// <summary>A Square booking. Updating or cancelling it needs <see cref="Version"/>.</summary>
public sealed record ShopBooking(
    string Id,
    int Version,
    ShopBookingStatus Status,
    DateTimeOffset StartAt,
    string? CustomerId
);
