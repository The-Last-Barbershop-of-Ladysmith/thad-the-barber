using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>
/// No booking with this id, or a manage token that doesn't match it. Both are 404, so a wrong token never reveals that
/// the booking exists (BR-08).
/// </summary>
public sealed class BookingNotFoundException(string message)
    : ProblemException(
        StatusCodes.Status404NotFound,
        "booking_not_found",
        "That booking wasn't found.",
        message,
        null
    );
