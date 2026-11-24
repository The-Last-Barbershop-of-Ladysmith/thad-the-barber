namespace ThadTheBarber.Api.Features.TextMessages.Models;

public enum SendMarkerState
{
    /// <summary>Taken by one caller, who is about to send; a marker stuck here means that caller crashed mid-send.</summary>
    Claimed,

    Sent,

    /// <summary>The phone had replied STOP, so nothing was sent and nothing will be.</summary>
    Refused,
}
