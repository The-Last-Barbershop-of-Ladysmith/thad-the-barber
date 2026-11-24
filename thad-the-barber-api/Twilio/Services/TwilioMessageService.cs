using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;
using TwilioApiConnectionException = global::Twilio.Exceptions.ApiConnectionException;
using TwilioApiException = global::Twilio.Exceptions.ApiException;
using TwilioRestClient = global::Twilio.Clients.TwilioRestClient;
using TwilioSystemNetHttpClient = global::Twilio.Http.SystemNetHttpClient;
using CreateMessageOptions = global::Twilio.Rest.Api.V2010.Account.CreateMessageOptions;
using MessageResource = global::Twilio.Rest.Api.V2010.Account.MessageResource;
using PhoneNumber = global::Twilio.Types.PhoneNumber;

namespace ThadTheBarber.Api.Twilio.Services;

/// <summary>
/// Sends texts over the official SDK with the same API key as <see cref="TwilioVerifyService"/>, through the Messaging
/// Service when one is set and from the sender number otherwise. Like Verify, every failure is a
/// <see cref="TwilioRequestFailedException"/> holding only the status and Twilio's error code, so the SDK's message,
/// which can repeat the phone or the text, never reaches the logs.
/// </summary>
public sealed class TwilioMessageService(IOptions<TwilioSettings> settings, IHttpClientFactory httpClientFactory) : ITwilioMessageService
{
    private readonly Lazy<TwilioRestClient> _client = new(() => CreateClient(settings.Value, httpClientFactory));

    public async Task<string> SendAsync(string phone, string body, CancellationToken cancellationToken)
    {
        TwilioSettings twilio = settings.Value;
        if (!twilio.CanSendTexts)
        {
            throw new TwilioNotConfiguredException();
        }

        cancellationToken.ThrowIfCancellationRequested();

        CreateMessageOptions options = new(new PhoneNumber(phone))
        {
            Body = body,
        };
        if (twilio.MessagingServiceSid.Length > 0)
        {
            options.MessagingServiceSid = twilio.MessagingServiceSid;
        }
        else
        {
            options.From = new PhoneNumber(twilio.FromNumber);
        }

        if (twilio.WebhookBaseUrl.Length > 0)
        {
            options.StatusCallback = new Uri(twilio.StatusCallbackUrl);
        }

        try
        {
            MessageResource message = await MessageResource.CreateAsync(options, _client.Value);
            return message.Sid;
        }
        catch (TwilioApiException exception)
        {
            throw new TwilioRequestFailedException(exception.Status, exception.Code);
        }
        catch (Exception exception) when (exception is TwilioApiConnectionException or HttpRequestException || IsTimeout(exception, cancellationToken))
        {
            throw new TwilioRequestFailedException(0, null);
        }
    }

    private static TwilioRestClient CreateClient(TwilioSettings twilioSettings, IHttpClientFactory httpClientFactory) =>
        new(
            twilioSettings.ApiKeySid,
            twilioSettings.ApiKeySecret,
            twilioSettings.AccountSid,
            httpClient: new TwilioSystemNetHttpClient(httpClientFactory.CreateClient(TwilioSetup.HttpClientName))
        );

    private static bool IsTimeout(Exception exception, CancellationToken cancellationToken) =>
        exception is TaskCanceledException && !cancellationToken.IsCancellationRequested;
}
