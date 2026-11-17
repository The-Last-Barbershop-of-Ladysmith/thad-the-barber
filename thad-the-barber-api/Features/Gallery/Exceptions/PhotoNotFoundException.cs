using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Gallery.Exceptions;

/// <summary>No photo in the gallery has that file name (deleted already, or never there).</summary>
public sealed class PhotoNotFoundException()
    : ProblemException(
        StatusCodes.Status404NotFound,
        "photo_not_found",
        "That photo isn't in the gallery.",
        "No gallery photo has that file name.",
        null
    );
