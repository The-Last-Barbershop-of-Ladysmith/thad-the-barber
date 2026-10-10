namespace ThadTheBarber.Api.Recaptcha.Models;

public sealed record TokenProperties(
    bool Valid,
    string? InvalidReason,
    string? Hostname,
    string? Action
);
