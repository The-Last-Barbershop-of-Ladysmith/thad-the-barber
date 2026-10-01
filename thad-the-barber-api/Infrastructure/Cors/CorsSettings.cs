namespace ThadTheBarber.Api.Infrastructure.Cors;

/// <summary>
/// Browser origins allowed to call the API. In Azure they come from the <c>Cors--AllowedOrigins--N</c> Key Vault secrets,
/// which the Key Vault configuration provider maps to <c>Cors:AllowedOrigins:N</c>.
/// </summary>
public sealed class CorsSettings
{
    public const string SectionName = "Cors";

    public string[] AllowedOrigins { get; set; } = [];
}
