using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Session.Exceptions;

/// <summary>The request didn't come from the site: its <c>Origin</c> is missing or not in <c>Cors:AllowedOrigins</c>.</summary>
public sealed class OriginNotAllowedException(string message)
    : ProblemException(
        StatusCodes.Status403Forbidden,
        "origin_not_allowed",
        "Sessions are only for the site.",
        message,
        null
    );
