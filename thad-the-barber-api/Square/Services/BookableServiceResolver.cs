using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>The shop's one service (BR-01), which availability and booking calls need.</summary>
public sealed class BookableServiceResolver(ISquareService square, IOptions<SquareSettings> settings)
{
    public async Task<BookableService> ResolveAsync(CancellationToken cancellationToken)
    {
        List<BookableService> bookableServices = await square.GetBookableServicesAsync(cancellationToken);
        return Select(bookableServices, settings.Value.ServiceVariationId);
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
