using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Features.Admin.Endpoints;
using ThadTheBarber.Api.Features.Gallery.Exceptions;
using ThadTheBarber.Api.Features.Gallery.Models;
using ThadTheBarber.Api.Features.Gallery.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.Gallery.Endpoints;

public static class AdminGalleryEndpoints
{
    public static IEndpointRouteBuilder MapAdminGalleryEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder group = api.MapGroup("/admin/gallery")
            .RequireAuthorization(AdminEndpoints.AdminPolicy)
            .WithTags("Admin");
        group.MapGet("/", GetPhotosAsync)
            .WithName("GetAdminGallery")
            .NoStore();
        // The admin token is a bearer header, not a cookie, so a form post can't be forged from another site.
        group.MapPost("/", UploadPhotoAsync)
            .DisableAntiforgery()
            .WithName("UploadAdminGalleryPhoto")
            .NoStore();
        group.MapDelete("/{fileName}", DeletePhotoAsync)
            .WithName("DeleteAdminGalleryPhoto")
            .NoStore();
        return api;
    }

    /// <summary>Every photo with its file name, newest first; 503 <c>gallery_unavailable</c> when the folder can't be read.</summary>
    internal static async Task<Ok<List<AdminGalleryPhoto>>> GetPhotosAsync(
        AdminGalleryService gallery,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await gallery.GetAllAsync(cancellationToken));

    /// <summary>
    /// Adds a photo (form fields <c>file</c> and <c>altText</c>) and answers 201 with it; 400 <c>invalid_image</c> for a
    /// file that isn't a JPEG, PNG, WebP or AVIF, is too big, or has no description.
    /// </summary>
    internal static async Task<Created<AdminGalleryPhoto>> UploadPhotoAsync(
        IFormFile? file,
        [FromForm] string? altText,
        AdminGalleryService gallery,
        CancellationToken cancellationToken)
    {
        byte[] bytes = await ImageUploads.ReadAsync(file, cancellationToken);
        AdminGalleryPhoto photo = await gallery.UploadAsync(bytes, altText, cancellationToken);
        return TypedResults.Created($"/api/admin/gallery/{Uri.EscapeDataString(photo.FileName)}", photo);
    }

    /// <summary>Removes a photo; 404 <c>photo_not_found</c> when there is none by that name.</summary>
    internal static async Task<NoContent> DeletePhotoAsync(
        string fileName,
        AdminGalleryService gallery,
        CancellationToken cancellationToken)
    {
        await gallery.DeleteAsync(fileName, cancellationToken);
        return TypedResults.NoContent();
    }
}
