namespace ThadTheBarber.Api.Features.TextMessages.Models;

public enum ReminderState
{
    Pending,

    /// <summary>Taken by one run, which is about to send; a reminder stuck here means that run crashed mid-send.</summary>
    Claimed,

    Sent,

    /// <summary>Not sent: the phone had replied STOP, or the booking came too close to its start by the time a run found it.</summary>
    Skipped,
}
