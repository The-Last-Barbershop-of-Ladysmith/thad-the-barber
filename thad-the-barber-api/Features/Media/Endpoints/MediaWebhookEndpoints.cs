using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Features.Media.Exceptions;
using ThadTheBarber.Api.Features.Media.Models;
using ThadTheBarber.Api.Features.Media.Services;

namespace ThadTheBarber.Api.Features.Media.Endpoints;

public static class MediaWebhookEndpoints
{
    /// <summary>The Event Grid subscription's delivery header, whose secret value is the <c>MediaWebhook--Key</c> secret.</summary>
    public const string KeyHeader = "x-media-webhook-key";

    /// <summary>
    /// An Event Grid batch about this account's two containers is a few KB. The same length as Square's cap keeps one
    /// request limit for both webhooks, stops anonymous callers making the API buffer large bodies, and keeps the read
    /// buffer off the large object heap.
    /// </summary>
    public const int MaxBodyLength = 32 * 1024;

    /// <summary>Event Grid calls this without a session token; its secret header stands in for one.</summary>
    public static IEndpointRouteBuilder MapMediaWebhookEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/webhooks/media", ReceiveAsync)
            .WithName("ReceiveMediaWebhook")
            .AllowAnonymous()
            .ExcludeFromDescription();
        return api;
    }

    /// <summary>
    /// 200 once the notification is handled (echoing the code when it's Event Grid's subscription handshake), 400
    /// <c>invalid_body</c>, 401 <c>invalid_webhook_key</c>, or 413 <c>payload_too_large</c>. Reading one character past
    /// the cap tells a body that's too long, with or without a <c>Content-Length</c>.
    /// </summary>
    internal static async Task<Results<Ok, Ok<EventGridValidationResponse>>> ReceiveAsync(
        HttpRequest request,
        [FromHeader(Name = KeyHeader)] string? key,
        MediaWebhookService webhooks,
        CancellationToken cancellationToken)
    {
        using StreamReader reader = new(request.Body);
        char[] buffer = new char[MaxBodyLength + 1];
        int length = await reader.ReadBlockAsync(buffer, cancellationToken);
        if (length > MaxBodyLength)
        {
            throw new MediaWebhookBodyTooLargeException();
        }

        string? validationCode = webhooks.Handle(new string(buffer, 0, length), key);
        if (validationCode is null)
        {
            return TypedResults.Ok();
        }

        return TypedResults.Ok(new EventGridValidationResponse(validationCode));
    }
}
