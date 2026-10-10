namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>Thad's Square booking settings, plus the single service's length (<see cref="SlotMinutes"/>).</summary>
public sealed record BookingSettings(
    int MinNoticeMinutes,
    int MaxAdvanceDays,
    int SlotMinutes,
    bool CanCustomersCancel
);
