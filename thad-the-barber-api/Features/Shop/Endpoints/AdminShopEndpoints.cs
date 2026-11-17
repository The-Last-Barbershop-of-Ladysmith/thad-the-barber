using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Admin.Endpoints;
using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Features.Shop.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Shop.Endpoints;

public static class AdminShopEndpoints
{
    public static IEndpointRouteBuilder MapAdminShopEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder group = api.MapGroup("/admin/shop")
            .RequireAuthorization(AdminEndpoints.AdminPolicy)
            .WithTags("Admin");
        group.MapGet("/", GetShopInfoAsync)
            .WithName("GetAdminShopInfo")
            .NoStore();
        group.MapPut("/", SaveShopInfoAsync)
            .WithName("SaveAdminShopInfo")
            .NoStore();
        return api;
    }

    /// <summary>The saved notice, whether it shows, and Square's description; 503 <c>shop_info_unavailable</c> when the file can't be read.</summary>
    internal static async Task<Ok<AdminShopInfo>> GetShopInfoAsync(
        AdminShopService shop,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await shop.GetAsync(cancellationToken));

    /// <summary>Saves the notice and its switch and answers with them; 400 <c>validation_failed</c> or 503 <c>shop_info_unavailable</c>.</summary>
    internal static async Task<Ok<AdminShopInfo>> SaveShopInfoAsync(
        ShopInfoSaveRequest request,
        AdminShopService shop,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await shop.SaveAsync(request, cancellationToken));
}
