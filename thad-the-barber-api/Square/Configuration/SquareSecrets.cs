namespace ThadTheBarber.Api.Square.Configuration;

/// <summary>
/// Square secrets kept out of configuration. The API reads the refresh token and app secret only when renewing the
/// access token; the connect script (tools/square-connect) writes the refresh token, and the API never writes either.
/// The sandbox seed's token (tools/square-seed) shares the dev vault but the API never uses it.
/// </summary>
public static class SquareSecrets
{
    public const string RefreshToken = "Square--RefreshToken";
    public const string ApplicationSecret = "Square--ApplicationSecret";
    public const string SandboxSeedToken = "Square--SandboxAccessToken";

    public static readonly IReadOnlySet<string> All = new HashSet<string>([RefreshToken, ApplicationSecret, SandboxSeedToken]);
}
