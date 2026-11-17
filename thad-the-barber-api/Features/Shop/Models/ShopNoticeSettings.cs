namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// What the owner set for the booking page's notice in <c>shop-info.json</c>: their own <see cref="Notice"/> text, which
/// replaces the Square location's description when there is one, and whether the notice <see cref="IsNoticeShown"/> at
/// all. With no file, the Square description shows as before.
/// </summary>
public sealed record ShopNoticeSettings(
    string? Notice,
    bool IsNoticeShown
)
{
    public static ShopNoticeSettings Default { get; } = new(null, true);
}
