namespace ThadTheBarber.Api.Square;

/// <summary>Every call to Square's API goes through this service (M2 adds location, catalog, availability and bookings).</summary>
public interface ISquareService
{
    /// <summary>Whether Square's API answers at all. Used by <c>GET /api/health?deep=true</c>.</summary>
    Task<bool> IsReachableAsync(CancellationToken cancellationToken);
}
