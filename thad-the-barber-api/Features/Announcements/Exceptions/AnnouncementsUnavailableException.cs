using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Announcements.Exceptions;

/// <summary>The announcements file couldn't be read, or isn't valid JSON, or couldn't be saved, so the admin is told rather than shown an empty list.</summary>
public sealed class AnnouncementsUnavailableException(string message, Exception? innerException)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "announcements_unavailable",
        "The announcements couldn't be reached.",
        message,
        innerException
    );
