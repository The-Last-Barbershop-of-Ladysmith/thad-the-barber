namespace ThadTheBarber.Api.Features.MarketingTexts.Models;

/// <summary>A phone (E.164) that agreed to the shop's news texts, when, and where.</summary>
public sealed record MarketingOptIn(
    string Phone,
    DateTimeOffset ConsentedAt,
    MarketingOptInSource Source
);
