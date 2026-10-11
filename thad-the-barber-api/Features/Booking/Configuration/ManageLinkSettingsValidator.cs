using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Features.Booking.Configuration;

/// <summary>Fails startup unless the HMAC key is base64 of at least 32 bytes, the size of a SHA-256 hash.</summary>
public sealed class ManageLinkSettingsValidator : IValidateOptions<ManageLinkSettings>
{
    private const int MinimumKeyBytes = 32;

    public ValidateOptionsResult Validate(string? name, ManageLinkSettings options)
    {
        Span<byte> key = new byte[options.HmacKey.Length];
        if (!Convert.TryFromBase64String(options.HmacKey, key, out int keyBytes) || keyBytes < MinimumKeyBytes)
        {
            return ValidateOptionsResult.Fail($"ManageLink:HmacKey must be base64 of at least {MinimumKeyBytes} random bytes.");
        }

        return ValidateOptionsResult.Success;
    }
}
