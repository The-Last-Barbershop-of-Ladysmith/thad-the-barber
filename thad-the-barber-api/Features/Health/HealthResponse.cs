using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Health;

/// <summary>Body of <c>GET /api/health</c>. <see cref="Square"/> is only present on a deep check.</summary>
public sealed record HealthResponse(
    string Status,
    string Version,
    string Commit,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Square = null);
