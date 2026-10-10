using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Features.Session.Configuration;

public static class SessionSetup
{
    private static readonly TimeSpan clockSkew = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Session tokens, and a bearer one required on every endpoint unless it's marked <c>AllowAnonymous</c>. Needs the
    /// <see cref="Azure.Security.KeyVault.Keys.KeyClient"/> that <c>KeyVaultSetup</c> registers, and reCAPTCHA.
    /// </summary>
    public static IServiceCollection AddSessionAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SessionSettings>()
            .Bind(configuration.GetSection(SessionSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<ISessionSigningKey, KeyVaultSessionSigningKey>();
        services.AddSingleton<SessionTokenIssuer>();
        services.AddScoped<SessionService>();

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
