using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Admin.Endpoints;
using ThadTheBarber.Api.Features.Announcements.Models;
using ThadTheBarber.Api.Features.Announcements.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Announcements.Endpoints;

public static class AdminAnnouncementsEndpoints
{
    public static IEndpointRouteBuilder MapAdminAnnouncementsEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder group = api.MapGroup("/admin/announcements")
            .RequireAuthorization(AdminEndpoints.AdminPolicy)
            .WithTags("Admin");
        group.MapGet("/", GetAnnouncementsAsync)
            .WithName("GetAdminAnnouncements")
            .NoStore();
        group.MapPut("/", SaveAnnouncementsAsync)
            .WithName("SaveAdminAnnouncements")
            .NoStore();
        return api;
    }

    /// <summary>Every announcement with its status today; 503 <c>announcements_unavailable</c> when the file can't be read.</summary>
    internal static async Task<Ok<List<AdminAnnouncement>>> GetAnnouncementsAsync(
        AdminAnnouncementsService announcements,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await announcements.GetAllAsync(cancellationToken));

    /// <summary>Replaces the whole list and answers with it as saved; 400 <c>validation_failed</c> or 503 <c>announcements_unavailable</c>.</summary>
    internal static async Task<Ok<List<AdminAnnouncement>>> SaveAnnouncementsAsync(
        AnnouncementsSaveRequest request,
        AdminAnnouncementsService announcements,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await announcements.SaveAsync(request.Items, cancellationToken));
}
