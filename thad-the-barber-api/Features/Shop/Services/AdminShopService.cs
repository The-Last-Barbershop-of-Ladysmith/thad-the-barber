using ThadTheBarber.Api.Features.Shop.Models;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Shop.Services;

/// <summary>The admin's view of the shop info: what is saved, and the Square description it falls back to.</summary>
public sealed class AdminShopService(ShopContentService content, ISquareService square)
{
    public async Task<AdminShopInfo> GetAsync(CancellationToken cancellationToken)
    {
        ShopNoticeSettings saved = await content.ReadAsync(cancellationToken);
        return await ToAdminShopInfoAsync(saved, cancellationToken);
    }

    public async Task<AdminShopInfo> SaveAsync(ShopInfoSaveRequest request, CancellationToken cancellationToken)
    {
        await content.SaveAsync(request, cancellationToken);
        return await GetAsync(cancellationToken);
    }

    private async Task<AdminShopInfo> ToAdminShopInfoAsync(ShopNoticeSettings saved, CancellationToken cancellationToken)
    {
        ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
        return new AdminShopInfo(saved.Notice, saved.IsNoticeShown, shop.Description);
    }
}
