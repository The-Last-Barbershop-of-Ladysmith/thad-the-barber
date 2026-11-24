namespace ThadTheBarber.Api.Features.MarketingTexts.Models;

/// <summary>
/// A phone (E.164) that agreed to the shop's news texts, when, where, and under which wording of the consent text. Once
/// <see cref="OptedOutAt"/> is set (they replied STOP) the phone gets no more news texts until it agrees again.
/// </summary>
public sealed record MarketingOptIn(
    string Phone,
    DateTimeOffset ConsentedAt,
    MarketingOptInSource Source,
    string ConsentTextVersion,
    DateTimeOffset? OptedOutAt
)
{
    /// <summary>The wording of the sign-up consent as of this version; change it with the text on the form and the Terms page.</summary>
    public const string CurrentConsentTextVersion = "2026-11-19";

    public bool IsActive => OptedOutAt is null;
}
