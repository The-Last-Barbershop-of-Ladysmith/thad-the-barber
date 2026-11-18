using Microsoft.AspNetCore.Http.Features;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Infrastructure.Storage.Middleware;

public static class ImageUploadSizeLimit
{
    /// <summary>The form around the file: its boundaries, field names and the description.</summary>
    public const int FormOverheadBytes = 1024 * 1024;

    /// <summary>The most a photo upload request can carry: the largest photo plus the form around it.</summary>
    public const int MaxRequestBytes = ImageFileInspector.MaxBytes + FormOverheadBytes;

    /// <summary>
    /// Lets the endpoints marked with <see cref="AllowImageUpload"/> read a body as big as a photo. Every other endpoint
    /// keeps the small limit set for the whole API, so only a signed-in admin's upload can send this much.
    /// </summary>
    public static IApplicationBuilder UseImageUploadSizeLimit(this IApplicationBuilder app) =>
        app.Use((context, next) =>
        {
            bool isUpload = context.GetEndpoint()?.Metadata.GetMetadata<ImageUploadMetadata>() is not null;
            IHttpMaxRequestBodySizeFeature? feature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (isUpload && feature is { IsReadOnly: false })
            {
                feature.MaxRequestBodySize = MaxRequestBytes;
            }

            return next(context);
        });

    /// <summary>Marks an endpoint as taking a photo upload (see <see cref="UseImageUploadSizeLimit"/>).</summary>
    public static TBuilder AllowImageUpload<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.WithMetadata(new ImageUploadMetadata());
}
