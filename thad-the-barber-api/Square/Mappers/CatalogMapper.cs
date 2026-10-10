using Square;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class CatalogMapper
{
    /// <summary>The variations of an appointment service item that customers can book online.</summary>
    public static List<BookableService> ToBookableServices(this CatalogObject catalogObject)
    {
        if (!catalogObject.IsItem
            || catalogObject.AsItem() is not { IsDeleted: not true, ItemData: { } item }
            || item.ProductType != CatalogItemProductType.AppointmentsService)
        {
            return new List<BookableService>();
        }

        return (item.Variations ?? [])
            .Where(variation => variation.IsItemVariation)
            .Select(variation => variation.AsItemVariation())
            .Where(variation => variation is { IsDeleted: not true, ItemVariationData.AvailableForBooking: true })
            .Select(variation => new BookableService(
                item.Name ?? string.Empty,
                variation.Id,
                variation.Version ?? throw new InvalidOperationException($"Square variation {variation.Id} has no version."),
                TimeSpan.FromMilliseconds(variation.ItemVariationData!.ServiceDuration
                    ?? throw new InvalidOperationException($"Square variation {variation.Id} has no service duration.")),
                variation.ItemVariationData.TeamMemberIds?.ToList() ?? new List<string>()
            )).ToList();
    }
}
