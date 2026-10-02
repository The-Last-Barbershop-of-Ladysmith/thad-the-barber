using System.Reflection;

namespace ThadTheBarber.Api.Features.Health;

/// <summary>The app version and the commit it was built from, reported by <c>GET /api/health</c>.</summary>
public sealed record BuildInfo(string Version, string Commit)
{
    /// <summary>
    /// Reads the informational version, which the SDK stamps as <c>1.0.0+&lt;commit sha&gt;</c> when it builds inside a
    /// git checkout (locally and in CI).
    /// </summary>
    public static BuildInfo FromAssembly(Assembly assembly)
    {
        string informational = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            ?? "0.0.0";
        int plus = informational.IndexOf('+', StringComparison.Ordinal);
        return plus < 0
            ? new BuildInfo(informational, "unknown")
            : new BuildInfo(informational[..plus], informational[(plus + 1)..]);
    }
}
