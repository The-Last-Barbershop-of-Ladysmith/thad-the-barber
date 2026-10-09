using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>The time was booked elsewhere after the customer picked it.</summary>
public sealed class SlotUnavailableException(string message, Exception? innerException = null)
    : ProblemException(
        StatusCodes.Status409Conflict,
        "slot_unavailable",
        "That time is no longer available.",
        message,
        innerException
    );
