namespace ThadTheBarber.Api.Recaptcha.Models;

/// <summary>Google's verdict on one reCAPTCHA token, holding only what the bot check uses.</summary>
/// <param name="InvalidReason">Why the token is invalid, e.g. <c>EXPIRED</c> or <c>DUPE</c>.</param>
/// <param name="Hostname">The site the token was made on.</param>
/// <param name="Score">From 0 (likely a bot) to 1 (likely a person); 0 when Google gave none.</param>
public sealed record RecaptchaAssessment(
    bool IsValid,
    string? InvalidReason,
    string? Action,
    string? Hostname,
    double Score
);
