namespace ThadTheBarber.Api.Square.Models;

/// <summary>The seller's booking settings, plus the location's Square booking site (the fallback, BR-14).</summary>
public sealed record BookingProfile(
    bool IsOnlineBookingEnabled,
    TimeSpan MinimumNotice,
    TimeSpan MaximumAdvance,
    bool CanCustomersCancel,
    string? SquareBookingSiteUrl
);
