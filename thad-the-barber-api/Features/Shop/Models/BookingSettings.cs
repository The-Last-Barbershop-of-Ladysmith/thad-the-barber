namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>
/// Thad's Square booking settings, plus the single service's name and length (<see cref="ServiceName"/>,
/// <see cref="SlotMinutes"/>). The price is never sent (BR-11).
/// </summary>
public sealed record BookingSettings(
    int MinNoticeMinutes,
    int MaxAdvanceDays,
    int SlotMinutes,
    string ServiceName,
    bool CanCustomersCancel
);
