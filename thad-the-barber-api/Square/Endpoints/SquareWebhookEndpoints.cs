using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Square.Endpoints;

public static class SquareWebhookEndpoints
{
    public const string SignatureHeader = "x-square-hmacsha256-signature";

    /// <summary>
    /// Square's notifications are a few KB. The cap stops anonymous callers making the API buffer large bodies, and keeps
    /// the read buffer off the large object heap.
    /// </summary>
    public const int MaxBodyLength = 32 * 1024;

    /// <summary>Square calls this without a session token; its signature stands in for one.</summary>
    public static IEndpointRouteBuilder MapSquareWebhookEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/webhooks/square", ReceiveAsync)
            .WithName("ReceiveSquareWebhook")
            .AllowAnonymous()
            .ExcludeFromDescription();
        return api;
    }

    /// <summary>
    /// 200 once the notification is handled, 401 <c>invalid_signature</c>, or 413 <c>payload_too_large</c>. The body is
    /// read as raw text because the signature covers it exactly as sent; reading one character past the cap tells a body
    /// that's too long, with or without a <c>Content-Length</c>.
    /// </summary>
    internal static async Task<Ok> ReceiveAsync(
        HttpRequest request,
        [FromHeader(Name = SignatureHeader)] string? signature,
        SquareWebhookService webhooks,
        CancellationToken cancellationToken)
    {
        using StreamReader reader = new(request.Body);
        char[] buffer = new char[MaxBodyLength + 1];
        int length = await reader.ReadBlockAsync(buffer, cancellationToken);
        if (length > MaxBodyLength)
        {
            throw new WebhookBodyTooLargeException();
        }

        webhooks.Handle(new string(buffer, 0, length), signature);
        return TypedResults.Ok();
    }
}
