using OneOf.Types;
using Square;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Models;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>Every call to Square's API goes through this service (M2 adds location, catalog, availability and bookings).</summary>
public interface ISquareService
{
    /// <summary>Whether Square answers and accepts our token. Used by <see cref="Features.Health.Checks.SquareHealthCheck"/>.</summary>
    Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken);

    Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken);

    Task<BookingProfile> GetBookingProfileAsync(CancellationToken cancellationToken);

    Task<BookableService[]> GetBookableServicesAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<TimeSlot>> SearchAvailableTimeSlots(DateTimeRange dateTimeRange, BookableService service, CancellationToken cancellationToken);

    Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken);

    Task<string> CreateCustomerAsync(string name, string phone, CancellationToken cancellationToken);

    Task<Appointment> CreateBookingAsync(string customerId, string serviceVariationId, string locationId, string teamMemberId, TimeSlot slot, CancellationToken cancellationToken);

    Task<Appointment> CancelBookingAsync(string bookingId, int version, CancellationToken cancellationToken);

    Task<Appointment> RescheduleBookingAsync(string bookingId, int version, TimeSlot slot, CancellationToken cancellationToken);
}
