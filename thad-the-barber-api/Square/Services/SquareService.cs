using Azure;
using Azure.Identity;
using Square;
using Square.Bookings;
using Square.Catalog;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

public sealed class SquareService : ISquareService
{
    private readonly SquareClient square;

    public SquareService(SquareClient square)
{
        this.square = square;
    }

    public Task<Appointment> CancelBookingAsync(string bookingId, int version, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        try
        {
            await square.OAuth.RetrieveTokenStatusAsync(cancellationToken: cancellationToken);
            return SquareConnection.Connected;
        }
        catch (Exception exception) when (exception is SquareNotConnectedException or SquareApiException { StatusCode: StatusCodes.Status401Unauthorized })
        {
            return SquareConnection.NotConnected;
        }
        catch (Exception exception) when (exception is SquareException or HttpRequestException
            or RequestFailedException or AuthenticationFailedException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return SquareConnection.Unreachable;
        }
    }

    public Task<Appointment> CreateBookingAsync(string customerId, string serviceVariationId, string locationId, string teamMemberId, TimeSlot slot, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<string> CreateCustomerAsync(string name, string phone, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public async Task<BookableService> GetBookableServiceAsync(CancellationToken cancellationToken)
    {
        SearchCatalogItemsRequest request = new()
    {
            ProductTypes = [CatalogItemProductType.AppointmentsService]
        };

        SearchCatalogItemsResponse response = await square.Catalog.SearchItemsAsync(request, cancellationToken: cancellationToken);

        // Expecting only one bookable service, so we can safely use Single() here.
        // If there are multiple services, this will throw an exception.
        return (response.Items ?? []).SelectMany(item => item.ToBookableServices()).Single();
    }

    public Task<BookingProfile> GetBookingProfileAsync(CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<Appointment> RescheduleBookingAsync(string bookingId, int version, TimeSlot slot, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }

    public Task<List<TimeSlot>> SearchAvailableTimeSlots(DateTimeRange dateTimeRange, BookableService service, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }
}
