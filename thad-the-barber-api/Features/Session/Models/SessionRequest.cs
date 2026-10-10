namespace ThadTheBarber.Api.Features.Session.Models;

/// <param name="RecaptchaToken">From <c>grecaptcha.execute(siteKey, { action: 'session' })</c> in the browser.</param>
public sealed record SessionRequest(
    string? RecaptchaToken
);
