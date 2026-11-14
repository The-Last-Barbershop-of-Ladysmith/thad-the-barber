using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Services;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Signs lookup tokens with <see cref="ApiFactory.ManageLinkHmacKey"/>, the key <see cref="ApiFactory"/> hosts use.</summary>
public static class LookupTokens
{
    public static LookupTokenSigner CreateSigner(TimeProvider time, string hmacKey = ApiFactory.ManageLinkHmacKey) =>
        new(
            Options.Create(new ManageLinkSettings
            {
                HmacKey = hmacKey,
            }),
            time
        );
}
