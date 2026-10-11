using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// The manage link's token (BR-08): HMAC-SHA256 of the booking id, base64url so it fits a URL fragment. Whoever holds
/// it can view, cancel and reschedule that one booking.
/// </summary>
public sealed class ManageTokenSigner(IOptions<ManageLinkSettings> settings)
{
    private readonly byte[] _key = Convert.FromBase64String(settings.Value.HmacKey);

    public string Sign(string bookingId) =>
        Base64Url.EncodeToString(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(bookingId)));

    /// <summary>Compares in constant time, so response timing can't reveal how much of a guessed token is right.</summary>
    public bool IsValid(string bookingId, string? token) =>
        token is not null
        && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(token), Encoding.UTF8.GetBytes(Sign(bookingId)));
}
