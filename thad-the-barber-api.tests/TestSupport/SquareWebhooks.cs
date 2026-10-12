using System.Security.Cryptography;
using System.Text;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// Signs webhook bodies the way Square does: base64 HMAC-SHA256 of the notification URL followed by the body. Written
/// from Square's spec rather than with the SDK, so the tests check the API's use of the SDK's verifier.
/// </summary>
public static class SquareWebhooks
{
    public static string Sign(
        string body,
        string key = SquareHarness.WebhookSignatureKey,
        string notificationUrl = SquareHarness.WebhookNotificationUrl) =>
        Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes(notificationUrl + body)));
}
