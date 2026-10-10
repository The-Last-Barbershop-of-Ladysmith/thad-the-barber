namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary><see cref="PostalCode"/> is as Square holds it, which can be ZIP+4.</summary>
public sealed record Address(
    string Street,
    string City,
    string State,
    string PostalCode
);
