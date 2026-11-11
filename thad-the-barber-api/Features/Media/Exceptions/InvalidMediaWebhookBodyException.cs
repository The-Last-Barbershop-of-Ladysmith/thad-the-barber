using System.Text.Json;
using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Media.Exceptions;

/// <summary>A media webhook body that isn't the JSON array of events Event Grid sends.</summary>
public sealed class InvalidMediaWebhookBodyException(JsonException? innerException)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "invalid_body",
        "The webhook body is not valid.",
        "A media webhook call's body wasn't a JSON array of events.",
        innerException
    );
