using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// The next open times for the home page, kept for <see cref="BookingSettings.NextTimesCacheFor"/> and shared by every
/// visitor. A failed search isn't kept, so the next request tries Square again. Unlike <see cref="AvailabilityService"/>,
/// a time taken meanwhile can still show here; booking it re-checks with Square (BR-10).
/// </summary>
public sealed class NextTimesService(AvailabilityService availability, TimeProvider time, IOptions<BookingSettings> settings) : IDisposable
{
    public const int MaxCount = 12;

    private readonly SemaphoreSlim _searchLock = new(1, 1);
    private List<DateTimeOffset> _upcomingTimes = [];
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public async Task<List<DateTimeOffset>> GetNextAsync(int count, CancellationToken cancellationToken)
    {
        await _searchLock.WaitAsync(cancellationToken);
        try
        {
            if (time.GetUtcNow() >= _expiresAt)
            {
                _upcomingTimes = await availability.GetUpcomingTimesAsync(cancellationToken);
                _expiresAt = time.GetUtcNow() + settings.Value.NextTimesCacheFor;
            }

            return [.. _upcomingTimes.Take(count)];
        }
        finally
        {
            _searchLock.Release();
        }
    }

    public void Dispose() => _searchLock.Dispose();
}
