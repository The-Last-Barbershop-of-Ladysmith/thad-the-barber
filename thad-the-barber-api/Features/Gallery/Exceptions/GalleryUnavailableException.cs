using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Gallery.Exceptions;

/// <summary>The gallery folder couldn't be read or changed, so the admin is told rather than shown an empty gallery.</summary>
public sealed class GalleryUnavailableException(string message, Exception? innerException)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "gallery_unavailable",
        "The gallery couldn't be reached.",
        message,
        innerException
    );
