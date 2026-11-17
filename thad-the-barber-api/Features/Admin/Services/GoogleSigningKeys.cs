using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace ThadTheBarber.Api.Features.Admin.Services;

/// <summary>
/// Google's published signing keys, from its OpenID Connect discovery document. The manager caches them and refreshes
/// on its own schedule, which follows how often Google rotates them.
/// </summary>
public sealed class GoogleSigningKeys : IGoogleSigningKeys
{
    private const string DiscoveryAddress = "https://accounts.google.com/.well-known/openid-configuration";

    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configuration = new(
        DiscoveryAddress,
        new OpenIdConnectConfigurationRetriever(),
        new HttpDocumentRetriever()
    );

    public async Task<IReadOnlyCollection<SecurityKey>> GetAsync(CancellationToken cancellationToken)
    {
        OpenIdConnectConfiguration configuration = await _configuration.GetConfigurationAsync(cancellationToken);
        return [.. configuration.SigningKeys];
    }
}
