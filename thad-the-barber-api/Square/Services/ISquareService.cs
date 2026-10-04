using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>Every call to Square's API goes through this service (M2 adds location, catalog, availability and bookings).</summary>
public interface ISquareService
{
    /// <summary>Whether Square answers and accepts our token. Used by <see cref="Features.Health.Checks.SquareHealthCheck"/>.</summary>
    Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken);
}
