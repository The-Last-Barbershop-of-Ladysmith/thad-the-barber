namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary><see cref="Number"/> is E.164; the UI builds its <c>tel:</c> and <c>sms:</c> links from it.</summary>
public sealed record ShopPhone(
    string Display,
    string Number
);
