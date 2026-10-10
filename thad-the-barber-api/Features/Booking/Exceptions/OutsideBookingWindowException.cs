using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

/// <summary>No part of the asked-for month falls between the minimum notice and the maximum advance.</summary>
public sealed class OutsideBookingWindowException(string message)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "outside_booking_window",
        "That month is outside the booking window.",
        message,
        null
    );
