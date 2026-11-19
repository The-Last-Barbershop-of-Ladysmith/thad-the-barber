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

    /// <summary>
    /// The Messaging Service (<c>MG…</c>) that holds the registered 10DLC number and sends every text. Leave it empty
    /// until the campaign is approved; texts stay off. Twilio's test credentials can't use a Messaging Service, so dev
    /// and test send from <see cref="FromNumber"/> instead.
    /// </summary>
    public string MessagingServiceSid { get; set; } = string.Empty;

    /// <summary>
    /// A sender number in E.164, used when no Messaging Service is set. With Twilio's test credentials (the test account SID
    /// as both <see cref="AccountSid"/> and <see cref="ApiKeySid"/>, the test auth token as <see cref="ApiKeySecret"/>)
    /// it is the magic number <c>+15005550006</c>: Twilio checks the request and answers like a real send, and nothing is sent or billed.
    /// </summary>
    public string FromNumber { get; set; } = string.Empty;

    /// <summary>
    /// The account's auth token, from the <c>Twilio--AuthToken</c> Key Vault secret. Only the incoming-text and
    /// delivery-status webhooks need it: Twilio signs them with it, and an API key can't check a signature.
    /// </summary>
    public string AuthToken { get; set; } = string.Empty;

    /// <summary>
    /// Where Twilio reports each text's delivery (<c>…/api/webhooks/twilio/status</c>), sent with every message. Left empty,
    /// the Messaging Service's own delivery status URL in the Twilio console is used.
    /// </summary>
    public string StatusCallbackUrl { get; set; } = string.Empty;

    public bool IsConfigured => AccountSid.Length > 0 && VerifyServiceSid.Length > 0 && ApiKeySid.Length > 0 && ApiKeySecret.Length > 0;

    /// <summary>Whether texts can be sent: the account is set up and there is a Messaging Service or a sender number to send from.</summary>
    public bool CanSendTexts => IsConfigured && (MessagingServiceSid.Length > 0 || FromNumber.Length > 0);
}
