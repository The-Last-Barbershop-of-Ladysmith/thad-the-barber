using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Admin.Exceptions;

/// <summary>The environment has no Google client ID or no allowed emails yet, so nobody can sign in.</summary>
public sealed class AdminUnavailableException(string message)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "admin_unavailable",
        "The admin area isn't set up yet.",
        message,
        null
    );
