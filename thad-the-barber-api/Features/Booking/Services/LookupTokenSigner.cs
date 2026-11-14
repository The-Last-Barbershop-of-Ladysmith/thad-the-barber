using System.Buffers.Text;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// The token that keeps a phone trusted after its text code was checked (BR-20): <c>base64url(phone|expiry).base64url(mac)</c>,
/// where expiry is in unix seconds and is fixed when the token is issued. It's signed with a key derived from the
/// manage-link key and a purpose, so a lookup token can never pass as a manage token or the other way round. Whoever
/// holds it can read that phone's upcoming bookings until it expires.
/// </summary>
public sealed class LookupTokenSigner(IOptions<ManageLinkSettings> settings, TimeProvider time)
{
    private const char PartSeparator = '.';
    private const char PayloadSeparator = '|';
    private static readonly byte[] purpose = Encoding.UTF8.GetBytes("lookup-token-v1");

    private readonly byte[] _key = HMACSHA256.HashData(Convert.FromBase64String(settings.Value.HmacKey), purpose);

    public string Sign(string phone, DateTimeOffset expiresAt)
    {
        byte[] payload = Encoding.UTF8.GetBytes(string.Create(CultureInfo.InvariantCulture, $"{phone}{PayloadSeparator}{expiresAt.ToUnixTimeSeconds()}"));
        return $"{Base64Url.EncodeToString(payload)}{PartSeparator}{Base64Url.EncodeToString(HMACSHA256.HashData(_key, payload))}";
    }

    /// <summary>The phone the token was issued for, or null when it's missing, malformed, tampered with or expired.</summary>
    public string? ReadPhone(string? token)
    {
        string[] parts = token?.Split(PartSeparator) ?? [];
        if (parts.Length != 2 || !Base64Url.IsValid(parts[0]) || !Base64Url.IsValid(parts[1]))
        {
            return null;
        }

        byte[] payload = Base64Url.DecodeFromChars(parts[0]);
        bool isSignatureValid = CryptographicOperations.FixedTimeEquals(Base64Url.DecodeFromChars(parts[1]), HMACSHA256.HashData(_key, payload));
        if (!isSignatureValid)
        {
            return null;
        }

        string[] payloadParts = Encoding.UTF8.GetString(payload).Split(PayloadSeparator);
        long expiresAtSeconds = 0;
        bool isPayloadReadable = payloadParts.Length == 2 && long.TryParse(payloadParts[1], CultureInfo.InvariantCulture, out expiresAtSeconds);
        if (!isPayloadReadable)
        {
            return null;
        }

        bool isExpired = time.GetUtcNow() >= DateTimeOffset.FromUnixTimeSeconds(expiresAtSeconds);
        if (isExpired)
        {
            return null;
        }

        return payloadParts[0];
    }
}
