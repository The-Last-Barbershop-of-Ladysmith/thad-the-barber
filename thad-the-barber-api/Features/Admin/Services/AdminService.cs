using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Admin.Configuration;
using ThadTheBarber.Api.Features.Admin.Exceptions;
using ThadTheBarber.Api.Features.Admin.Models;

namespace ThadTheBarber.Api.Features.Admin.Services;

/// <summary>
/// Turns a Google sign-in into an admin session, or refuses it. Every sign-in and denial is logged with the email
/// masked, so there is a trail of who tried to get in without keeping addresses.
/// </summary>
public sealed partial class AdminService(
    GoogleIdTokenValidator validator,
    AdminTokenIssuer issuer,
    IOptions<AdminSettings> settings,
    ILogger<AdminService> logger)
{
    /// <summary>The Google client ID for the sign-in button, or <see cref="AdminUnavailableException"/> while it isn't set.</summary>
    public AdminConfig GetConfig() =>
        settings.Value.IsConfigured
            ? new AdminConfig(settings.Value.GoogleClientId!)
            : throw new AdminUnavailableException("Admin:GoogleClientId or Admin:AllowedEmails isn't set.");

    public async Task<AdminSession> SignInAsync(string? idToken, CancellationToken cancellationToken)
    {
        _ = GetConfig();
        if (string.IsNullOrWhiteSpace(idToken))
        {
            throw new InvalidIdTokenException("The request has no Google ID token.");
        }

        GoogleIdentity identity = await validator.ValidateAsync(idToken, cancellationToken);
        string maskedEmail = MaskEmail(identity.Email);
        bool isAllowed = settings.Value.AllowedEmails.Contains(identity.Email, StringComparer.OrdinalIgnoreCase);
        if (!isAllowed)
        {
            LogSignInDenied(maskedEmail);
            throw new AdminNotAuthorizedException("The Google account isn't on Admin:AllowedEmails.");
        }

        LogSignedIn(maskedEmail);
        return await issuer.IssueAsync(identity, cancellationToken);
    }

    [LoggerMessage(EventName = "AdminSignedIn", Level = LogLevel.Information, Message = "Admin signed in: {MaskedEmail}.")]
    private partial void LogSignedIn(string maskedEmail);

    [LoggerMessage(EventName = "AdminSignInDenied", Level = LogLevel.Warning, Message = "Admin sign-in denied for {MaskedEmail}.")]
    private partial void LogSignInDenied(string maskedEmail);

    /// <summary>"jordan@example.com" becomes "j***@e***.com".</summary>
    public static string MaskEmail(string email)
    {
        int at = email.IndexOf('@');
        int dot = email.LastIndexOf('.');
        if (at < 1 || dot < at + 2)
        {
            return "***";
        }

        return $"{email[0]}***@{email[at + 1]}***{email[dot..]}";
    }
}
