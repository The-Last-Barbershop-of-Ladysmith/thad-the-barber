namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

/// <summary>
/// Per-client-IP limits on the public POST endpoints. BR-13 sets the booking one; cancelling and rescheduling have their
/// own, so failed booking attempts can't stop a customer managing the booking they made.
/// </summary>
public sealed class RateLimitSettings
{
    public const string SectionName = "RateLimits";

    public FixedWindowLimit Session { get; set; } = new();

    public FixedWindowLimit Booking { get; set; } = new();

    public FixedWindowLimit Manage { get; set; } = new();
}
