namespace ThadTheBarber.Api.Square.Models;

/// <summary>The seller's booking settings, plus the location's Square booking site (the fallback, BR-14).</summary>
public sealed record BookingProfile(
    bool BookingEnabled,
    TimeSpan MinNotice,
    TimeSpan MaxAdvance,
    bool CustomersCanCancel,
    string? BookingSiteUrl);
