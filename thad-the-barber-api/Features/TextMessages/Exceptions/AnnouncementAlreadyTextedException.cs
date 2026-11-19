using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.TextMessages.Exceptions;

/// <summary>This announcement's text was already requested, so it isn't sent a second time.</summary>
public sealed class AnnouncementAlreadyTextedException(string id)
    : ProblemException(
        StatusCodes.Status409Conflict,
        "already_texted",
        "This announcement was already texted.",
        $"Announcement {id} already has a text sent or scheduled.",
        null
    );
