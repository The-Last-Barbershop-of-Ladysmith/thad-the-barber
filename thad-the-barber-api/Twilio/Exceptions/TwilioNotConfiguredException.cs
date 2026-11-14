namespace ThadTheBarber.Api.Twilio.Exceptions;

public sealed class TwilioNotConfiguredException()
    : Exception("Twilio Verify isn't configured in this environment.");
