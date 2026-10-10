using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Session.Exceptions;

/// <summary>The visitor didn't pass reCAPTCHA, or it couldn't be checked; the UI offers call/text instead (BR-24).</summary>
public sealed class BotCheckFailedException(string message, Exception? innerException = null)
    : ProblemException(
        StatusCodes.Status403Forbidden,
        "bot_check_failed",
        "We couldn't verify this browser.",
        message,
        innerException
    );
