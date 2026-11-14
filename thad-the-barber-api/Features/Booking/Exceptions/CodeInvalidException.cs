using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

public sealed class CodeInvalidException(string message)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "code_invalid",
        "That code didn't work.",
        message,
        null
    );
