using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Shop.Mappers;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Shop.Endpoints;

public static class ShopEndpoints
{
    public static IEndpointRouteBuilder MapShopEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/shop", GetShopAsync)
            .WithName("GetShop")
            .WithTags("Shop");
        return api;
    }

    internal static async Task<Ok<ShopInfo>> GetShopAsync(
        ISquareService square,
        BookableServiceResolver resolver,
        CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        Task<BookingProfile> bookingProfileTask = square.GetBookingProfileAsync(shopDetails.LocationId, cancellationToken);
        Task<BookableService> bookableServiceTask = resolver.ResolveAsync(cancellationToken);
        await Task.WhenAll(bookingProfileTask, bookableServiceTask);

        return TypedResults.Ok(shopDetails.ToShopInfoDto(bookingProfileTask.Result, bookableServiceTask.Result));
    }
}
