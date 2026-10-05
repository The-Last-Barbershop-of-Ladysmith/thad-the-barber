namespace ThadTheBarber.Api.Square.Models;

public sealed record ShopAddress(
    string Street,
    string City,
    string State,
    string PostalCode
);
