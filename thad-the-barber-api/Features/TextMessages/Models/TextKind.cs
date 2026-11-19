namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>Why a text was sent, as written in the message log.</summary>
public enum TextKind
{
    Confirmation,
    Reminder,
    Announcement,
}
