namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>How one attempt to text a phone ended.</summary>
public enum SendOutcome
{
    /// <summary>Twilio accepted the text.</summary>
    Sent,

    /// <summary>Texting is switched off, or no sender is set up, so nothing was tried.</summary>
    Disabled,

    /// <summary>The phone replied STOP to the shop's number, and Twilio refused to text it.</summary>
    OptedOut,

    /// <summary>Twilio refused the text, so it was not sent and trying again later is safe.</summary>
    Failed,

    /// <summary>Twilio couldn't be reached or didn't answer in time, so the text may or may not have gone; it is not tried again.</summary>
    Uncertain,
}
