namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

public sealed class FixedWindowLimit
{
    public int PermitLimit { get; set; }

    public TimeSpan Window { get; set; }
}
