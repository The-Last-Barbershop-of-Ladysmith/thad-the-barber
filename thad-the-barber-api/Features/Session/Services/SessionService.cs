using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Session.Exceptions;
using ThadTheBarber.Api.Features.Session.Models;
using ThadTheBarber.Api.Infrastructure.Cors.Configuration;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Recaptcha.Models;
using ThadTheBarber.Api.Recaptcha.Services;

namespace ThadTheBarber.Api.Features.Session.Services;

/// <summary>
/// Starts an anonymous session for a visitor on the site: the request must come from an allowed origin and pass
/// reCAPTCHA (a valid token made on that origin's host for the <see cref="RecaptchaAction"/> action, scoring at least
/// <c>Recaptcha:MinScore</c>). If Google can't be asked, nobody gets a session.
/// </summary>
public sealed partial class SessionService(
    IRecaptchaService recaptcha,
    SessionTokenIssuer issuer,
    IOptions<CorsSettings> cors,
    IOptions<RecaptchaSettings> recaptchaSettings,
    ILogger<SessionService> logger
)
{
    public const string RecaptchaAction = "session";

    public async Task<SessionToken> StartAsync(string origin, string? recaptchaToken, CancellationToken cancellationToken)
    {
        if (!cors.Value.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            throw new OriginNotAllowedException("The request's Origin isn't one of Cors:AllowedOrigins.");
        }

        if (string.IsNullOrWhiteSpace(recaptchaToken))
        {
            throw new BotCheckFailedException("The request had no reCAPTCHA token.");
        }

        RecaptchaAssessment assessment = await AssessAsync(recaptchaToken, cancellationToken);
        LogBotCheckScored(logger, assessment.Score, assessment.IsValid, assessment.InvalidReason, assessment.Action, assessment.Hostname);
        if (!Passes(assessment, new Uri(origin).Host))
        {
            throw new BotCheckFailedException("The reCAPTCHA token didn't pass.");
        }

        return await issuer.IssueAsync(cancellationToken);
    }

    private async Task<RecaptchaAssessment> AssessAsync(string recaptchaToken, CancellationToken cancellationToken)
    {
        try
        {
            return await recaptcha.AssessAsync(recaptchaToken, RecaptchaAction, cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            LogRecaptchaUnavailable(logger, exception);
            throw new BotCheckFailedException("reCAPTCHA couldn't assess the token.", exception);
        }
    }

    private bool Passes(RecaptchaAssessment assessment, string host) =>
        assessment.IsValid
        && assessment.Action == RecaptchaAction
        && string.Equals(assessment.Hostname, host, StringComparison.OrdinalIgnoreCase)
        && assessment.Score >= recaptchaSettings.Value.MinScore;

    [LoggerMessage(
        EventName = "BotCheckScored",
        Level = LogLevel.Information,
        Message = "reCAPTCHA scored {Score} (valid {IsValid}, reason {InvalidReason}, action {Action}, host {Hostname}).")]
    private static partial void LogBotCheckScored(ILogger logger, double score, bool isValid, string? invalidReason, string? action, string? hostname);

    [LoggerMessage(EventName = "RecaptchaUnavailable", Level = LogLevel.Warning, Message = "reCAPTCHA couldn't be asked, so the session was refused.")]
    private static partial void LogRecaptchaUnavailable(ILogger logger, Exception exception);
}
