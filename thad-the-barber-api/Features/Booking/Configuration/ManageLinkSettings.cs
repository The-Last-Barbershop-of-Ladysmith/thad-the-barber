namespace ThadTheBarber.Api.Features.Booking.Configuration;

public sealed class ManageLinkSettings
{
    public const string SectionName = "ManageLink";

    /// <summary>
    /// Base64 key that signs manage links, from the <c>ManageLink--HmacKey</c> Key Vault secret
    /// (<c>infra/scripts/Set-TtbSecrets.ps1 -Generate</c>). Replacing it breaks every manage link already sent.
    /// </summary>
    public string HmacKey { get; set; } = string.Empty;
}
