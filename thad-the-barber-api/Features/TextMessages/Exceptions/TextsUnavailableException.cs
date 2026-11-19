using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.TextMessages.Exceptions;

/// <summary>Texting is switched off (or storage failed), so nothing was sent or scheduled.</summary>
public sealed class TextsUnavailableException(string message, Exception? innerException = null)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "texts_unavailable",
        "Texts can't be sent right now.",
        message,
        innerException
    );
