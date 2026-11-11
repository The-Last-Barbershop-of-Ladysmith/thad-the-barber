using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Features.Announcements.Services;

namespace ThadTheBarber.Api.Features.Announcements.Endpoints;

public static class AnnouncementsEndpoints
{
    public static IEndpointRouteBuilder MapAnnouncementsEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/announcements", GetAnnouncementsAsync)
            .AllowAnonymous()
            .WithName("GetAnnouncements")
            .WithTags("Announcements");
        return api;
    }

    /// <summary>
    /// The announcements showing today on the shop's calendar, in the order of the file. A file that can't be read
    /// answers 200 with none, so the page hides the section.
    /// </summary>
    internal static async Task<Ok<List<Announcement>>> GetAnnouncementsAsync(
        AnnouncementsService announcements,
        CancellationToken cancellationToken)
    {
        return TypedResults.Ok(await announcements.GetActiveAsync(cancellationToken));
    }
}
