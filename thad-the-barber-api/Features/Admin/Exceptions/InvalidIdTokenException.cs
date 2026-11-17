using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Admin.Exceptions;

/// <summary>The Google ID token is missing, forged, expired, for another app, or has an unverified email.</summary>
public sealed class InvalidIdTokenException(string message, Exception? innerException = null)
    : ProblemException(
        StatusCodes.Status401Unauthorized,
        "invalid_id_token",
        "We couldn't verify your Google sign-in.",
        message,
        innerException
    );
