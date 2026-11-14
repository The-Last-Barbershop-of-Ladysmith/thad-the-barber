using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Contact.Models;
using ThadTheBarber.Api.Features.Contact.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Features.Contact.Endpoints;

public static class ContactEndpoints
{
    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapPost("/contact", SendMessageAsync)
            .WithName("SendContactMessage")
            .WithTags("Contact")
            .NoStore()
            .RequireRateLimiting(RateLimitSetup.ContactPolicy);
        return api;
    }

    /// <summary>
    /// Saves the message and answers 201 with its id; <see cref="ContactRequest"/>'s attributes and rules are checked
    /// before this runs. A message that can't be saved is 503 <c>contact_unavailable</c>.
    /// </summary>
    internal static async Task<Created<ContactReceipt>> SendMessageAsync(
        ContactRequest request,
        ContactService contact,
        CancellationToken cancellationToken) =>
        TypedResults.Created((string?)null, await contact.SendAsync(request, cancellationToken));
}
