using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>A webhook body longer than any Square notification, refused before it's read in full.</summary>
public sealed class WebhookBodyTooLargeException()
    : ProblemException(
        StatusCodes.Status413PayloadTooLarge,
        "payload_too_large",
        "The webhook body is too large.",
        "A Square webhook call's body was over the size cap.",
        null
    );
