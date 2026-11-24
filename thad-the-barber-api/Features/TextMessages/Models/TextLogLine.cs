namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>One line of the month's log: what happened to a text, found by its Twilio message SID. It holds no phone and no message.</summary>
public sealed record TextLogLine(
    DateTimeOffset At,
    TextKind Kind,
    string Reference,
    string? MessageSid,
    string Status
);
