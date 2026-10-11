using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>The appointment's start time has passed, so it can no longer be cancelled or moved (BR-07).</summary>
public sealed class BookingStartedException(string message)
    : ProblemException(
        StatusCodes.Status409Conflict,
        "booking_started",
        "That appointment has already started.",
        message,
        null
    );
