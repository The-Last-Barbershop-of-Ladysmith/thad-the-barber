using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Twilio.Configuration;

/// <summary>
/// Fails startup when Twilio is half configured or a value has the wrong kind of SID. Nothing set at all passes, so
/// environments without a Twilio account (tests, a new environment) still start; lookups there answer 503.
/// </summary>
public sealed class TwilioSettingsValidator : IValidateOptions<TwilioSettings>
{
    public ValidateOptionsResult Validate(string? name, TwilioSettings options)
    {
        if (options.AccountSid.Length + options.VerifyServiceSid.Length + options.ApiKeySid.Length + options.ApiKeySecret.Length == 0)
        {
            return ValidateOptionsResult.Success;
        }

        List<string> failures = [];
        AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.AccountSid), options.AccountSid, "AC");
        AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.VerifyServiceSid), options.VerifyServiceSid, "VA");
        AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.ApiKeySid), options.ApiKeySid, "SK");
        if (options.ApiKeySecret.Length == 0)
        {
            failures.Add($"{TwilioSettings.SectionName}:{nameof(TwilioSettings.ApiKeySecret)} is required once any Twilio setting is set.");
        }

        if (failures.Count > 0)
        {
            return ValidateOptionsResult.Fail(failures);
        }

        return ValidateOptionsResult.Success;
    }

    private static void AddFailureUnlessStartsWith(List<string> failures, string settingName, string value, string prefix)
    {
        if (!value.StartsWith(prefix, StringComparison.Ordinal))
        {
            failures.Add($"{TwilioSettings.SectionName}:{settingName} must start with {prefix}.");
        }
    }
}
