namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// The shop info the admin edits: the saved <see cref="Notice"/> (null when the Square description is used), whether it
/// <see cref="IsNoticeShown"/>, and the <see cref="SquareNotice"/> that shows when no text is saved.
/// </summary>
public sealed record AdminShopInfo(
    string? Notice,
    bool IsNoticeShown,
    string? SquareNotice
);
