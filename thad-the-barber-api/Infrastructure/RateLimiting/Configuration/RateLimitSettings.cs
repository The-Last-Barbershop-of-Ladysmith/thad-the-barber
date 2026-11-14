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

    public FixedWindowLimit NextTimes { get; set; } = new();

    public FixedWindowLimit LookupStart { get; set; } = new();

    public FixedWindowLimit LookupVerify { get; set; } = new();

    /// <summary>Per phone, not per IP: stops one number being flooded with texts from many addresses.</summary>
    public FixedWindowLimit LookupPhone { get; set; } = new();

    /// <summary>Per phone, not per IP: stops a code being guessed from many addresses.</summary>
    public FixedWindowLimit LookupVerifyPhone { get; set; } = new();
}
