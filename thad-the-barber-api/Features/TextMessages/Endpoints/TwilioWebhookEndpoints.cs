using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Twilio.Configuration;

namespace ThadTheBarber.Api.Features.TextMessages.Endpoints;

public static class TwilioWebhookEndpoints
{
    public const string SignatureHeader = "X-Twilio-Signature";

    /// <summary>Twilio calls these without a session token; its signature stands in for one.</summary>
    public static IEndpointRouteBuilder MapTwilioWebhookEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/webhooks/twilio/incoming", ReceiveIncomingAsync)
            .WithName("ReceiveTwilioIncoming")
            .AllowAnonymous()
            .ExcludeFromDescription();
        api.MapPost("/webhooks/twilio/status", ReceiveStatusAsync)
            .WithName("ReceiveTwilioStatus")
            .AllowAnonymous()
            .ExcludeFromDescription();
        return api;
    }

    /// <summary>
    /// 200 with an empty TwiML reply (Twilio sends the customer its own STOP and HELP answers), 401 <c>invalid_signature</c>,
    /// 413 <c>payload_too_large</c>, or 503 while the auth token and webhook address aren't set. The form is read as capped
    /// raw text, so its size is limited the same way as the other webhooks.
    /// </summary>
    internal static async Task<IResult> ReceiveIncomingAsync(
        HttpRequest request,
        [FromHeader(Name = SignatureHeader)] string? signature,
        TwilioWebhookService webhooks,
        CancellationToken cancellationToken)
    {
        await webhooks.HandleIncomingAsync(TwilioSettings.IncomingWebhookPath, await ReadFormAsync(request, cancellationToken), signature, cancellationToken);
        return TypedResults.Content("<Response></Response>", "text/xml");
    }

    internal static async Task<IResult> ReceiveStatusAsync(
        HttpRequest request,
        [FromHeader(Name = SignatureHeader)] string? signature,
        TwilioWebhookService webhooks,
        CancellationToken cancellationToken)
    {
        await webhooks.HandleStatusAsync(TwilioSettings.StatusWebhookPath, await ReadFormAsync(request, cancellationToken), signature, cancellationToken);
        return TypedResults.Ok();
    }

    private static async Task<IReadOnlyDictionary<string, string>> ReadFormAsync(HttpRequest request, CancellationToken cancellationToken)
    {
        string body = await request.ReadWebhookBodyAsync(cancellationToken);
        return QueryHelpers.ParseQuery(body).ToDictionary(field => field.Key, field => field.Value.ToString(), StringComparer.Ordinal);
    }
}
