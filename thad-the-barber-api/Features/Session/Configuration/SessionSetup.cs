using ThadTheBarber.Api.Features.Session.Services;

namespace ThadTheBarber.Api.Features.Session.Configuration;

public static class SessionSetup
{
    /// <summary>
    /// Issuing session tokens. Needs the <see cref="Azure.Security.KeyVault.Keys.KeyClient"/> that <c>KeyVaultSetup</c>
    /// registers, and reCAPTCHA.
    /// </summary>
    public static IServiceCollection AddSessionTokens(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SessionSettings>()
            .Bind(configuration.GetSection(SessionSettings.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<ISessionSigningKey, KeyVaultSessionSigningKey>();
        services.AddSingleton<SessionTokenIssuer>();
        services.AddScoped<SessionService>();
        return services;
    }
}
