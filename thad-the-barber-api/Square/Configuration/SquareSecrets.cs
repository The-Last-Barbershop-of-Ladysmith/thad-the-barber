namespace ThadTheBarber.Api.Square.Configuration;

/// <summary>
/// Key Vault secrets the API reads only when renewing the Square access token, so they're never loaded into
/// configuration. The connect script (tools/square-connect) writes the refresh token; the API never writes either.
/// </summary>
public static class SquareSecrets
{
    public const string RefreshToken = "Square--RefreshToken";
    public const string ApplicationSecret = "Square--ApplicationSecret";

    public static readonly IReadOnlySet<string> All = new HashSet<string>([RefreshToken, ApplicationSecret]);
}
