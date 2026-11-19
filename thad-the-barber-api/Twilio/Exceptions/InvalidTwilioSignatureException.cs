using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Twilio.Exceptions;

/// <summary>A webhook call didn't carry a valid Twilio signature, so it's refused without being read.</summary>
public sealed class InvalidTwilioSignatureException()
    : ProblemException(
        StatusCodes.Status401Unauthorized,
        "invalid_signature",
        "The signature is not valid.",
        "A Twilio webhook call failed signature verification.",
        null
    );
