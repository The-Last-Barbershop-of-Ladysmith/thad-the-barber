using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>A cancelled booking can't be rescheduled; the customer books a new time instead.</summary>
public sealed class BookingCancelledException(string message)
    : ProblemException(
        StatusCodes.Status409Conflict,
        "booking_cancelled",
        "That booking was cancelled.",
        message,
        null
    );
