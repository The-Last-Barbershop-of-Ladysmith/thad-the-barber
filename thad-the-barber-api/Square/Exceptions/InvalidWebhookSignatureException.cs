using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>A webhook call that Square didn't sign for this URL and key, or whose body changed after signing.</summary>
public sealed class InvalidWebhookSignatureException()
    : ProblemException(
        StatusCodes.Status401Unauthorized,
        "invalid_signature",
        "The webhook signature is not valid.",
        "A Square webhook call failed signature verification.",
        null
    );
