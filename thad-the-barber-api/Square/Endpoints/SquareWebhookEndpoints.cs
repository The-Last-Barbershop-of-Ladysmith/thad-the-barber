using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
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
    /// 200 once the notification is handled, or 401 <c>invalid_signature</c>. The body is read as raw text because the
    /// signature covers it exactly as sent.
    /// </summary>
    internal static async Task<Ok> ReceiveAsync(
        HttpRequest request,
        [FromHeader(Name = SignatureHeader)] string? signature,
        SquareWebhookService webhooks,
        CancellationToken cancellationToken)
    {
        using StreamReader reader = new(request.Body);
        string body = await reader.ReadToEndAsync(cancellationToken);
        webhooks.Handle(body, signature);
        return TypedResults.Ok();
    }
}
