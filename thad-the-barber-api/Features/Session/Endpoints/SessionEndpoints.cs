using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Session.Models;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Session.Endpoints;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/session", StartSessionAsync)
            .WithName("StartSession")
            .WithTags("Session")
            .AllowAnonymous()
            .NoStore();
        return api;
    }

    /// <summary>
    /// A session token for a visitor who passes the bot check, or 403 <c>bot_check_failed</c> /
    /// <c>origin_not_allowed</c>. The body is optional so that a missing token is a failed bot check, not a 400.
    /// </summary>
    internal static async Task<Ok<SessionToken>> StartSessionAsync(
        SessionRequest? request,
        HttpRequest httpRequest,
        SessionService sessions,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await sessions.StartAsync(httpRequest.Headers.Origin.ToString(), request?.RecaptchaToken, cancellationToken));
}
