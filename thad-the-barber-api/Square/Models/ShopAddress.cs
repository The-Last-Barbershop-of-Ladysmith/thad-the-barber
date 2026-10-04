namespace ThadTheBarber.Api.Square.Models;

public sealed record ShopAddress(
    string Street,
    string Locality,
    string Region,
    string PostalCode
);
