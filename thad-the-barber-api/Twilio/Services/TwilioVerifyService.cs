using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Twilio.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;
using TwilioApiConnectionException = global::Twilio.Exceptions.ApiConnectionException;
using TwilioApiException = global::Twilio.Exceptions.ApiException;
using TwilioRestClient = global::Twilio.Clients.TwilioRestClient;
using TwilioSystemNetHttpClient = global::Twilio.Http.SystemNetHttpClient;
using CreateVerificationCheckOptions = global::Twilio.Rest.Verify.V2.Service.CreateVerificationCheckOptions;
using CreateVerificationOptions = global::Twilio.Rest.Verify.V2.Service.CreateVerificationOptions;
using VerificationCheckResource = global::Twilio.Rest.Verify.V2.Service.VerificationCheckResource;
using VerificationResource = global::Twilio.Rest.Verify.V2.Service.VerificationResource;

namespace ThadTheBarber.Api.Twilio.Services;

/// <summary>
/// Twilio Verify over the official SDK with an API key. The SDK's types never leave <c>Twilio/</c>; every failure is
/// a <see cref="TwilioRequestFailedException"/>, so the SDK's messages, which can hold the phone, never reach the logs.
/// </summary>
public sealed class TwilioVerifyService(IOptions<TwilioSettings> settings, IHttpClientFactory httpClientFactory) : ITwilioVerifyService
{
    private const string SmsChannel = "sms";
    private const string ApprovedStatus = "approved";
    private const int VerificationNotFoundErrorCode = 20404;
    private const int MaxCheckAttemptsErrorCode = 60202;
    private readonly Lazy<TwilioRestClient> _client = new(() => CreateClient(settings.Value, httpClientFactory));

    public async Task StartAsync(string phone, CancellationToken cancellationToken)
    {
        await CallTwilioAsync(
            () => VerificationResource.CreateAsync(
                new CreateVerificationOptions(settings.Value.VerifyServiceSid, phone, SmsChannel),
                _client.Value
            ),
            cancellationToken
        );
    }

    public async Task<bool> CheckAsync(string phone, string code, CancellationToken cancellationToken)
    {
        try
        {
            VerificationCheckResource check = await CallTwilioAsync(
                () => VerificationCheckResource.CreateAsync(
                    new CreateVerificationCheckOptions(settings.Value.VerifyServiceSid)
                    {
                        To = phone,
                        Code = code,
                    },
                    _client.Value
                ),
                cancellationToken
            );

            return check.Status == ApprovedStatus;
        }
        catch (TwilioRequestFailedException exception)
        {
            // 20404: the verification expired, was approved or was deleted; 60202: its five checks are used up. Other 404
            // and 429 codes (a wrong service, account throttling) are real failures.
            bool isCodeRefused = exception.TwilioErrorCode is VerificationNotFoundErrorCode or MaxCheckAttemptsErrorCode;
            if (!isCodeRefused)
            {
                throw;
            }

            return false;
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

    private async Task<T> CallTwilioAsync<T>(Func<Task<T>> call, CancellationToken cancellationToken)
    {
        if (!settings.Value.IsConfigured)
        {
            throw new TwilioNotConfiguredException();
        }

        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            return await call();
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
}
