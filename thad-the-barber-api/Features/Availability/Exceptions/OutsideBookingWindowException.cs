using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Availability.Exceptions;

/// <summary>No part of the asked-for day or month falls between the minimum notice and the maximum advance.</summary>
public sealed class OutsideBookingWindowException(string message)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "outside_booking_window",
        "That date is outside the booking window.",
        message,
        null
    );
