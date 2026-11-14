namespace ThadTheBarber.Api.Twilio.Configuration;

/// <summary>
/// Twilio Verify, which texts and checks the code for finding a customer's bookings (BR-20). The Verify service SID is in
/// <c>appsettings.{Environment}.json</c>; the account SID and API key come from the <c>Twilio--AccountSid</c>,
/// <c>Twilio--ApiKeySid</c> and <c>Twilio--ApiKeySecret</c> Key Vault secrets (<c>infra/scripts/Set-TtbSecrets.ps1</c>). Left entirely empty, the
/// API starts and every lookup answers 503 <c>verification_unavailable</c>.
/// </summary>
public sealed class TwilioSettings
{
    public const string SectionName = "Twilio";

    public string AccountSid { get; set; } = string.Empty;

    public string VerifyServiceSid { get; set; } = string.Empty;

    public string ApiKeySid { get; set; } = string.Empty;

    public string ApiKeySecret { get; set; } = string.Empty;

    public bool IsConfigured => AccountSid.Length > 0 && VerifyServiceSid.Length > 0 && ApiKeySid.Length > 0 && ApiKeySecret.Length > 0;
}
