using ThadTheBarber.Api.Features.Admin.Endpoints;
using ThadTheBarber.Api.Features.Admin.Services;

namespace ThadTheBarber.Api.Features.Admin.Configuration;

public static class AdminSetup
{
    /// <summary>
    /// Admin sign-in and the <c>Admin</c> policy. Needs the <see cref="Session.Services.ISessionSigningKey"/> that
    /// <c>SessionSetup</c> registers; <c>AuthSetup</c> makes the bearer check accept the admin audience.
    /// </summary>
    public static IServiceCollection AddAdmin(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<AdminSettings>().Bind(configuration.GetSection(AdminSettings.SectionName));
        services.AddSingleton<IGoogleSigningKeys, GoogleSigningKeys>();
        services.AddSingleton<GoogleIdTokenValidator>();
        services.AddSingleton<AdminTokenIssuer>();
        services.AddScoped<AdminService>();
        services.AddAuthorizationBuilder().AddPolicy(
            AdminEndpoints.AdminPolicy,
            policy => policy.RequireRole(AdminTokenIssuer.AdminRole)
        );
        return services;
    }
}
