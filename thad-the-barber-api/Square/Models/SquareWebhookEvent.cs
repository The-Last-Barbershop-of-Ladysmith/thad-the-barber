using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Square.Models;

/// <summary>The part of a Square webhook notification the API uses; the changed object itself is refetched, not read from here.</summary>
public sealed record SquareWebhookEvent(
    [property: JsonPropertyName("event_id")] string EventId,
    [property: JsonPropertyName("type")] string Type
);
