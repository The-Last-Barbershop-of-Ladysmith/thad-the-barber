using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Square.Endpoints;

public static class SquareWebhookEndpoints
{
    public const string SignatureHeader = "x-square-hmacsha256-signature";

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
        webhooks.Handle(await request.ReadWebhookBodyAsync(cancellationToken), signature);
        return TypedResults.Ok();
    }
}
