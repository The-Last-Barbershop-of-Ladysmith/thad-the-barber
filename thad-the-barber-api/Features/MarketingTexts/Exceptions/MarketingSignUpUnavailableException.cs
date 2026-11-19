using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.MarketingTexts.Exceptions;

/// <summary>The sign-up couldn't be saved, so the visitor is told to try again rather than that they are on the list.</summary>
public sealed class MarketingSignUpUnavailableException(Exception innerException)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "text_updates_unavailable",
        "We couldn't sign you up.",
        "The news texts sign-up couldn't be saved.",
        innerException
    );
