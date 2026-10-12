using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

/// <summary>Fails startup when a limit is missing, since a zero limit would refuse every request.</summary>
public sealed class RateLimitSettingsValidator : IValidateOptions<RateLimitSettings>
{
    public ValidateOptionsResult Validate(string? name, RateLimitSettings options)
    {
        List<string> failures = [];
        AddFailures(failures, nameof(RateLimitSettings.Session), options.Session);
        AddFailures(failures, nameof(RateLimitSettings.Booking), options.Booking);
        if (failures.Count > 0)
        {
            return ValidateOptionsResult.Fail(failures);
        }

        return ValidateOptionsResult.Success;
    }

    private static void AddFailures(List<string> failures, string limitName, FixedWindowLimit limit)
    {
        if (limit.PermitLimit < 1)
        {
            failures.Add($"{RateLimitSettings.SectionName}:{limitName}:PermitLimit must be at least 1.");
        }

        if (limit.Window <= TimeSpan.Zero)
        {
            failures.Add($"{RateLimitSettings.SectionName}:{limitName}:Window must be longer than zero, e.g. 00:10:00.");
        }
    }
}
