namespace ThadTheBarber.Api.Square.Models;

public sealed record CachedValue<T>(
    T Value,
    DateTimeOffset FetchedAt,
    DateTimeOffset RefreshAt
);
