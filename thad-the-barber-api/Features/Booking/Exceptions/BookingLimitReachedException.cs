using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>The phone number already holds as many upcoming appointments as BR-13 allows; the customer calls or texts instead.</summary>
public sealed class BookingLimitReachedException(string message)
    : ProblemException(
        StatusCodes.Status409Conflict,
        "booking_limit",
        "This phone number has reached its limit of upcoming appointments.",
        message,
        null
    );
