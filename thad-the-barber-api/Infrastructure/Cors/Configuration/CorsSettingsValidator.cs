using Microsoft.Extensions.Options;

namespace ThadTheBarber.Api.Infrastructure.Cors.Configuration;

/// <summary>Fails startup unless every allowed origin is an exact http(s) origin: no wildcard, path or trailing slash.</summary>
public sealed class CorsSettingsValidator : IValidateOptions<CorsSettings>
{
    public ValidateOptionsResult Validate(string? name, CorsSettings options)
    {
        if (options.AllowedOrigins.Length == 0)
        {
            return ValidateOptionsResult.Fail("Cors:AllowedOrigins is empty, so no browser could call the API.");
        }

        List<string> failures = [];
        foreach (string origin in options.AllowedOrigins)
        {
            if (origin.Contains('*', StringComparison.Ordinal))
            {
                failures.Add($"Cors:AllowedOrigins can't contain a wildcard ('{origin}').");
            }
            else if (!IsExactOrigin(origin))
            {
                failures.Add($"Cors:AllowedOrigins entry '{origin}' must be a scheme and host only, like https://example.com.");
            }
        }

        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }

    private static bool IsExactOrigin(string origin) =>
        Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
        && string.Equals(uri.GetLeftPart(UriPartial.Authority), origin, StringComparison.OrdinalIgnoreCase);
}
