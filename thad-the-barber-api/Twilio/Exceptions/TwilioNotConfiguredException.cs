namespace ThadTheBarber.Api.Twilio.Exceptions;

/// <summary>The Twilio settings are empty in this environment, so no text code can be sent or checked.</summary>
public sealed class TwilioNotConfiguredException()
    : Exception("Twilio Verify isn't configured in this environment.");
