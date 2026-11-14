using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Booking.Exceptions;

// 403, not 401: the UI's session interceptor renews the reCAPTCHA session and retries on every 401.
public sealed class LookupExpiredException(string message)
    : ProblemException(
        StatusCodes.Status403Forbidden,
        "lookup_expired",
        "Look up your bookings again.",
        message,
        null
    );
