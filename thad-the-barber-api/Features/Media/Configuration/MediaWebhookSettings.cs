namespace ThadTheBarber.Api.Features.Media.Configuration;

/// <summary>
/// What Event Grid sends with each change notification so the API knows the call is its own subscription's. The key is
/// a Key Vault secret (<c>MediaWebhook--Key</c>) and also the secret value of the subscription's delivery header. With
/// no key set, every call is refused.
/// </summary>
public sealed class MediaWebhookSettings
{
    public const string SectionName = "MediaWebhook";

    public string? Key { get; set; }
}
