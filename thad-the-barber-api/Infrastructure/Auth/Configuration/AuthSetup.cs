using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Infrastructure.Auth.Configuration;

public static class AuthSetup
{
    private static readonly TimeSpan clockSkew = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Every endpoint needs a session token from <c>POST /api/session</c> as <c>Authorization: Bearer</c>, unless it's
    /// marked <c>AllowAnonymous</c>. Needs the <see cref="ISessionSigningKey"/> that <c>SessionSetup</c> registers.
    /// </summary>
    public static IServiceCollection AddSessionBearerAuth(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<ISessionSigningKey>((options, signingKey) =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = SessionTokenIssuer.Issuer,
                    ValidAudience = SessionTokenIssuer.Audience,
                    ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
                    // A resolver, so the key is read from Key Vault on the first token, not at startup.
                    IssuerSigningKeyResolver = (_, _, _, _) => [signingKey.PublicKey],
                    ClockSkew = clockSkew,
                };
            });
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
        return services;
    }
}
