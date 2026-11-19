namespace ThadTheBarber.Api.Features.MarketingTexts.Models;

/// <summary>An entry of the old single-file list, <c>marketing-opt-ins.json</c>, which one blob per phone replaced.</summary>
public sealed record LegacyMarketingOptIn(
    string Phone,
    DateTimeOffset ConsentedAt,
    MarketingOptInSource Source
);
