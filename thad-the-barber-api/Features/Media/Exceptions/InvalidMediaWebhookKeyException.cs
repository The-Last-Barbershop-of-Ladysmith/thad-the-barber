using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Media.Exceptions;

/// <summary>A media webhook call without the subscription's secret header, or with a wrong one.</summary>
public sealed class InvalidMediaWebhookKeyException()
    : ProblemException(
        StatusCodes.Status401Unauthorized,
        "invalid_webhook_key",
        "The webhook key is not valid.",
        "A media webhook call had a missing or wrong key.",
        null
    );
