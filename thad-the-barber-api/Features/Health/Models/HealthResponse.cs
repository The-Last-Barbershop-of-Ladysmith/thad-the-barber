using System.Text.Json.Serialization;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ThadTheBarber.Api.Features.Health.Models;

/// <summary>
/// Body of <c>GET /api/health</c>. <see cref="Checks"/> maps each health check's name to its status and is only present
/// on a deep check.
/// </summary>
public sealed record HealthResponse(
    HealthStatus Status,
    string Version,
    string Commit,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyDictionary<string, HealthStatus>? Checks = null
);
