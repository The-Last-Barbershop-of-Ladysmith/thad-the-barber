namespace ThadTheBarber.Api.Features.Admin.Configuration;

/// <summary>
/// The admin area's sign-in. Both values are optional on purpose: an environment without them still starts, and
/// <c>POST /api/admin/session</c> answers 503 <c>admin_unavailable</c> until they are set, so a missing Key Vault
/// secret never takes the public site's API down.
/// </summary>
public sealed class AdminSettings
{
    public const string SectionName = "Admin";

    /// <summary>The Google OAuth client ID the sign-in button uses; a Google ID token must be issued for it.</summary>
    public string? GoogleClientId { get; set; }

    /// <summary>
    /// The Google accounts that may sign in (Key Vault: <c>Admin--AllowedEmails--0</c>, <c>--1</c>, …). Compared without
    /// regard to case; a change takes effect after a restart.
    /// </summary>
    public List<string> AllowedEmails { get; set; } = [];

    public TimeSpan Lifetime { get; set; } = TimeSpan.FromHours(4);

    public bool IsConfigured => !string.IsNullOrWhiteSpace(GoogleClientId) && AllowedEmails.Any(email => !string.IsNullOrWhiteSpace(email));
}
