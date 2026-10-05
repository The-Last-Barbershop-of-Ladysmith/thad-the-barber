namespace ThadTheBarber.Api.Common.Models;

/// <summary>From <see cref="Start"/> up to, but not including, <see cref="End"/>.</summary>
public sealed record DateTimeRange(
    DateTimeOffset Start,
    DateTimeOffset End
);
