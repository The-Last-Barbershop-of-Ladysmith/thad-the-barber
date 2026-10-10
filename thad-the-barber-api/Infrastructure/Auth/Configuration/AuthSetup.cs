using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Infrastructure.Auth.Configuration;

public static class AuthSetup
{
    private static readonly TimeSpan clockSkew = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Validates the session tokens from <c>POST /api/session</c>; <c>Program</c> requires one on the whole
    /// <c>/api</c> group. The options are built at startup, so the public key is read from Key Vault once, before the
    /// first request, and an unreadable key stops the app from starting (as unreadable secrets do) instead of turning
    /// every request into a 401. Needs the <see cref="ISessionSigningKey"/> that <c>SessionSetup</c> registers.
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
                    IssuerSigningKey = signingKey.PublicKey,
                    ClockSkew = clockSkew,
                };
            })
            .ValidateOnStart();
        services.AddAuthorization();
        return services;
    }
}
