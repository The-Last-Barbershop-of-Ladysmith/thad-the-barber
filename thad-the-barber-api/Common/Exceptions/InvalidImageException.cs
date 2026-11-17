
namespace ThadTheBarber.Api.Common.Exceptions;

/// <summary>The upload isn't a usable image (the wrong kind of file, too big, or missing its description), and the message says which.</summary>
public sealed class InvalidImageException(string message)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "invalid_image",
        "That image can't be used.",
        message,
        null
    );
