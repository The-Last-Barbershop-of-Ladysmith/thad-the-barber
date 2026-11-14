namespace ThadTheBarber.Api.Twilio.Exceptions;

/// <summary>
/// Twilio refused or couldn't answer a request. <see cref="Services.TwilioVerifyService"/> throws it in place of the
/// SDK's exception, whose message can repeat the phone number, so only the HTTP status and Twilio's error code are kept.
/// A status of 0 means Twilio couldn't be reached.
/// </summary>
public sealed class TwilioRequestFailedException(int statusCode, int? twilioErrorCode)
    : Exception($"Twilio answered {statusCode} (error code {twilioErrorCode}).")
{
    public int StatusCode { get; } = statusCode;
}
