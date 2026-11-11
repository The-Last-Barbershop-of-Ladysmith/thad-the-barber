using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Media.Exceptions;

/// <summary>A media webhook body longer than any Event Grid batch for this account, refused before it's read in full.</summary>
public sealed class MediaWebhookBodyTooLargeException()
    : ProblemException(
        StatusCodes.Status413PayloadTooLarge,
        "payload_too_large",
        "The webhook body is too large.",
        "A media webhook call's body was over the size cap.",
        null
    );
