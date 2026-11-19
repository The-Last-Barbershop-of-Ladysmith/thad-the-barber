namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>Why a text was sent, as written in the message log.</summary>
public enum TextKind
{
    Confirmation,
    Reminder,
    Announcement,

    /// <summary>Twilio's report of how a text ended up (delivered, undelivered, failed), found by the text's message SID.</summary>
    Delivery,
}
