namespace ThadTheBarber.Api.Twilio.Services;

public interface ITwilioMessageService
{
    /// <summary>
    /// Texts <paramref name="body"/> to an E.164 phone and returns Twilio's message SID. Failures are a
    /// <see cref="Exceptions.TwilioRequestFailedException"/> with Twilio's error code; 21610 means the phone replied STOP to
    /// the sender. Without a Messaging Service or sender number it throws <see cref="Exceptions.TwilioNotConfiguredException"/>.
    /// </summary>
    Task<string> SendAsync(string phone, string body, CancellationToken cancellationToken);
}
