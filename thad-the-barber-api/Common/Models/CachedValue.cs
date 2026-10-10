namespace ThadTheBarber.Api.Common.Models;

public sealed record CachedValue<T>(
    T Value,
    DateTimeOffset FetchedAt
);
