using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>The text code is wrong, expired or already used. The customer can ask for a new one (BR-20).</summary>
public sealed class CodeInvalidException(string message)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "code_invalid",
        "That code didn't work.",
        message,
        null
    );
