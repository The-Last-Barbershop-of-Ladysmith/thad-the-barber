using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Configuration;

namespace ThadTheBarber.Api.Features.TextMessages.Configuration;

/// <summary>Fails startup when texts are switched on without what they need, so a half-set-up environment doesn't start texting.</summary>
public sealed class TextMessagesSettingsValidator(IOptions<TwilioSettings> twilio) : IValidateOptions<TextMessagesSettings>
{
    public ValidateOptionsResult Validate(string? name, TextMessagesSettings options)
    {
        if (!options.IsEnabled)
        {
            return ValidateOptionsResult.Success;
        }

        List<string> failures = [];
        if (!Uri.TryCreate(options.SiteUrl, UriKind.Absolute, out Uri? siteUrl) || siteUrl.Scheme != Uri.UriSchemeHttps)
        {
            failures.Add($"{TextMessagesSettings.SectionName}:{nameof(TextMessagesSettings.SiteUrl)} must be an https URL while texts are enabled.");
        }

        if (!twilio.Value.CanSendTexts)
        {
            failures.Add($"{TextMessagesSettings.SectionName}:{nameof(TextMessagesSettings.IsEnabled)} needs Twilio set up with a Messaging Service or a sender number.");
        }

        if (options.ReminderMinimumNotice <= TimeSpan.Zero || options.ReminderLead <= options.ReminderMinimumNotice)
        {
            failures.Add($"{TextMessagesSettings.SectionName}:{nameof(TextMessagesSettings.ReminderLead)} must be longer than {nameof(TextMessagesSettings.ReminderMinimumNotice)}, which must be positive.");
        }

        if (options.ReminderHours.Count == 0 || options.ReminderHours.Any(hour => hour is < 0 or > 23))
        {
            failures.Add($"{TextMessagesSettings.SectionName}:{nameof(TextMessagesSettings.ReminderHours)} needs at least one hour from 0 to 23.");
        }

        if (failures.Count > 0)
        {
            return ValidateOptionsResult.Fail(failures);
        }

        return ValidateOptionsResult.Success;
    }
}
