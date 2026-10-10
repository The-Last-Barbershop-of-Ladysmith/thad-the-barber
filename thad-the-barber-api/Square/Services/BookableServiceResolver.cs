using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// The shop's one service (BR-01), which availability and booking calls need. Cached for <see cref="CacheFor"/>; a
/// failed lookup isn't cached, so a fixed catalog is picked up on the next call.
/// </summary>
public sealed class BookableServiceResolver(ISquareService square, IMemoryCache cache, IOptions<SquareSettings> settings)
{
    public static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(60);
    private const string CacheKey = "square:bookable-service";

    public async Task<BookableService> ResolveAsync(CancellationToken cancellationToken)
    {
        BookableService? bookableService = await cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            List<BookableService> bookableServices = await square.GetBookableServicesAsync(cancellationToken);
            return Select(bookableServices, settings.Value.ServiceVariationId);
        });

        return bookableService!;
    }

    /// <summary>
    /// A second bookable service is a Dashboard mistake, and guessing would book the wrong one, so without a pinned
    /// variation the catalog must hold exactly one.
    /// </summary>
    private static BookableService Select(List<BookableService> bookableServices, string? pinnedVariationId)
    {
        if (!string.IsNullOrEmpty(pinnedVariationId))
        {
            return bookableServices.FirstOrDefault(bookableService => bookableService.VariationId == pinnedVariationId)
                ?? throw new BookableServiceNotResolvedException(
                    $"The pinned service variation {pinnedVariationId} isn't bookable online.");
        }

        if (bookableServices.Count != 1)
        {
            throw new BookableServiceNotResolvedException(
                $"Square has {bookableServices.Count} services bookable online, not one. Fix the catalog or set Square:ServiceVariationId.");
        }

        return bookableServices[0];
    }
}
