using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Services;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Signs manage links with <see cref="ApiFactory.ManageLinkHmacKey"/>, the key <see cref="ApiFactory"/> hosts use.</summary>
public static class ManageTokens
{
    public static ManageTokenSigner Signer { get; } = CreateSigner(ApiFactory.ManageLinkHmacKey);

    public static ManageTokenSigner CreateSigner(string hmacKey) =>
        new(Options.Create(new ManageLinkSettings
        {
            HmacKey = hmacKey,
        }));
}
