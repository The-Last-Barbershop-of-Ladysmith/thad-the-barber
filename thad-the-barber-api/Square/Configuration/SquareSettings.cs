using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Square.Configuration;

public sealed class SquareSettings
{
    public const string SectionName = "Square";

    /// <summary>Square's API host: production or sandbox.</summary>
    [Required]
    public Uri BaseUrl { get; set; } = null!;

    /// <summary>The Square application's ID (not secret). Its secret is in Key Vault (<see cref="SquareSecrets"/>).</summary>
    [Required]
    public string ApplicationId { get; set; } = null!;

    /// <summary>Pins the shop's bookable service when the catalog holds more than one (BR-01). Usually unset.</summary>
    public string? ServiceVariationId { get; set; }

    /// <summary>
    /// This environment's webhook URL, exactly as entered in its Square subscription: Square signs it with the body.
    /// </summary>
    [Required]
    public Uri WebhookNotificationUrl { get; set; } = null!;

    /// <summary>The webhook subscription's signature key, from the <c>Square--WebhookSignatureKey</c> Key Vault secret.</summary>
    [Required]
    public string WebhookSignatureKey { get; set; } = null!;
}
