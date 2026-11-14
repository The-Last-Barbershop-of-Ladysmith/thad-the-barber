namespace ThadTheBarber.Api.Twilio.Services;

/// <summary>Every call to Twilio Verify goes through this service.</summary>
public interface ITwilioVerifyService
{
    /// <summary>Texts a one-time code to this E.164 phone.</summary>
    Task StartAsync(string phone, CancellationToken cancellationToken);

    /// <summary>
    /// Whether the code is right for the phone. A wrong, expired or already used code, and a code Twilio stopped
    /// accepting after too many wrong tries, are all false.
    /// </summary>
    Task<bool> CheckAsync(string phone, string code, CancellationToken cancellationToken);
}
