namespace ThadTheBarber.Api.Features.TextMessages.Models;

public sealed record SendAttempt(
    SendOutcome Outcome,
    string? MessageSid
);
