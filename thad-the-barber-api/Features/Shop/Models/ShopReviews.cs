namespace ThadTheBarber.Api.Features.Shop.Models;

public sealed record ShopReviews(
    double Score,
    int Count,
    string Source
);
