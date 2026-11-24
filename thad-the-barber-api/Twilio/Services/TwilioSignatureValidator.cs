using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;
using TwilioRequestValidator = global::Twilio.Security.RequestValidator;

namespace ThadTheBarber.Api.Twilio.Services;

/// <summary>
/// Checks Twilio's <c>X-Twilio-Signature</c> with the SDK's validator (an HMAC-SHA1, keyed with the account's auth token, of
/// the public URL and the form fields in name order; Twilio chose the algorithm). The URL is built from
/// <see cref="TwilioSettings.WebhookBaseUrl"/> and not from the request, since behind App Service the request's own scheme and
/// host are not what Twilio called. Without an auth token or base URL set no signature can be checked, so every call is
/// refused as not configured.
/// </summary>
public sealed class TwilioSignatureValidator(IOptions<TwilioSettings> settings)
{
    public void EnsureValid(string path, IReadOnlyDictionary<string, string> form, string? signature)
    {
        TwilioSettings twilio = settings.Value;
        if (twilio.AuthToken.Length == 0 || twilio.WebhookBaseUrl.Length == 0)
        {
            throw new TwilioNotConfiguredException();
        }

        bool isValid = signature is not null
            && new TwilioRequestValidator(twilio.AuthToken).Validate(twilio.WebhookBaseUrl.TrimEnd('/') + path, form.ToDictionary(field => field.Key, field => field.Value), signature);
        if (!isValid)
        {
            throw new InvalidTwilioSignatureException();
        }
    }
}
