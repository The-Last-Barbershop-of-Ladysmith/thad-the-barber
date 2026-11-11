using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Features.Gallery.Services;

namespace ThadTheBarber.Api.Features.Gallery.Endpoints;

public static class GalleryEndpoints
{
    public static IEndpointRouteBuilder MapGalleryEndpoints(this IEndpointRouteBuilder api)
    {
        api.MapGet("/gallery", GetGalleryAsync)
            .AllowAnonymous()
            .WithName("GetGallery")
            .WithTags("Gallery");
        return api;
    }

    /// <summary>
    /// The lookbook photos, newest upload first. Storage that can't be read answers 200 with no photos, so the page
    /// shows its empty state.
    /// </summary>
    internal static async Task<Ok<List<GalleryPhoto>>> GetGalleryAsync(
        GalleryService gallery,
        CancellationToken cancellationToken)
    {
        return TypedResults.Ok(await gallery.GetAsync(cancellationToken));
    }
}
