namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

/// <summary>Per-client-IP limits on the public POST endpoints (BR-13 sets the booking one).</summary>
public sealed class RateLimitSettings
{
    public const string SectionName = "RateLimits";

    public FixedWindowLimit Session { get; set; } = new();

    public FixedWindowLimit Booking { get; set; } = new();
}
