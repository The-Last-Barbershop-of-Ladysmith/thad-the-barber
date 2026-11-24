using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Admin.Endpoints;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.TextMessages.Endpoints;

public static class AdminAnnouncementTextsEndpoints
{
    public static IEndpointRouteBuilder MapAdminAnnouncementTextsEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder group = api.MapGroup("/admin/announcement-texts")
            .RequireAuthorization(AdminEndpoints.AdminPolicy)
            .WithTags("Admin");
        group.MapPost("/preview", PreviewAsync)
            .WithName("PreviewAnnouncementText")
            .NoStore();
        group.MapPost("/", RequestAsync)
            .WithName("RequestAnnouncementText")
            .NoStore();
        group.MapGet("/{id}", GetStatusAsync)
            .WithName("GetAnnouncementTextStatus")
            .NoStore();
        return api;
    }

    /// <summary>The suggested wording, how many people would get it, whether it would wait for the first day, and whether it was already texted.</summary>
    internal static async Task<Ok<AnnouncementTextPreview>> PreviewAsync(
        AnnouncementTextPreviewRequest request,
        AnnouncementTextService texts,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await texts.PreviewAsync(request, cancellationToken));

    /// <summary>
    /// 202 with where it stands; the texts go out in the background. 409 <c>already_texted</c> when this announcement was
    /// already texted or scheduled, 503 <c>texts_unavailable</c> while texting is off.
    /// </summary>
    internal static async Task<Accepted<AnnouncementTextStatus>> RequestAsync(
        AnnouncementTextRequest request,
        AnnouncementTextService texts,
        CancellationToken cancellationToken)
    {
        AnnouncementTextStatus status = await texts.RequestAsync(request, cancellationToken);
        return TypedResults.Accepted($"/api/admin/announcement-texts/{status.Id}", status);
    }

    internal static async Task<Results<Ok<AnnouncementTextStatus>, NotFound>> GetStatusAsync(
        string id,
        AnnouncementTextService texts,
        CancellationToken cancellationToken)
    {
        AnnouncementTextStatus? status = await texts.GetStatusAsync(id, cancellationToken);
        return status is null ? TypedResults.NotFound() : TypedResults.Ok(status);
    }
}
