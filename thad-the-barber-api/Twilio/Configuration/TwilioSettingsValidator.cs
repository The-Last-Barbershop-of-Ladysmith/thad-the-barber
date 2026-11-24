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
        bool isAnythingSet = options.AccountSid.Length + options.VerifyServiceSid.Length + options.ApiKeySid.Length + options.ApiKeySecret.Length
            + options.MessagingServiceSid.Length + options.FromNumber.Length + options.AuthToken.Length + options.WebhookBaseUrl.Length > 0;
        if (!isAnythingSet)
        {
            return ValidateOptionsResult.Success;
        }

        List<string> failures = [];
        AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.AccountSid), options.AccountSid, "AC");
        AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.VerifyServiceSid), options.VerifyServiceSid, "VA");
        if (options.AccountSid.Length == 0 || options.ApiKeySid != options.AccountSid)
        {
            // Twilio's test credentials have no API key: the account SID stands in for it, with the test auth token as the secret.
            AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.ApiKeySid), options.ApiKeySid, "SK");
        }

        if (options.MessagingServiceSid.Length > 0)
        {
            AddFailureUnlessStartsWith(failures, nameof(TwilioSettings.MessagingServiceSid), options.MessagingServiceSid, "MG");
        }

        if (options.FromNumber.Length > 0 && !options.FromNumber.StartsWith('+'))
        {
            failures.Add($"{TwilioSettings.SectionName}:{nameof(TwilioSettings.FromNumber)} must be a number in E.164 form, starting with +.");
        }

        if (options.ApiKeySecret.Length == 0)
        {
            failures.Add($"{TwilioSettings.SectionName}:{nameof(TwilioSettings.ApiKeySecret)} is required once any Twilio setting is set.");
        }

        if (options.WebhookBaseUrl.Length > 0 && (!Uri.TryCreate(options.WebhookBaseUrl, UriKind.Absolute, out Uri? webhookBase) || webhookBase.Scheme != Uri.UriSchemeHttps))
        {
            failures.Add($"{TwilioSettings.SectionName}:{nameof(TwilioSettings.WebhookBaseUrl)} must be an https URL.");
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
