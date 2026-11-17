using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Admin.Exceptions;

/// <summary>A real Google account, but not one on the allowlist: the UI says "Not authorized".</summary>
public sealed class AdminNotAuthorizedException(string message)
    : ProblemException(
        StatusCodes.Status403Forbidden,
        "not_authorized",
        "This Google account can't manage the site.",
        message,
        null
    );
