using Microsoft.IdentityModel.Tokens;

namespace ThadTheBarber.Api.Features.Admin.Services;

/// <summary>The public keys Google signs ID tokens with, so tests can use their own.</summary>
public interface IGoogleSigningKeys
{
    Task<IReadOnlyCollection<SecurityKey>> GetAsync(CancellationToken cancellationToken);
}
