using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>Every call to Square's API goes through this service (M2 adds location, catalog, availability and bookings).</summary>
public interface ISquareService
{
    /// <summary>Whether Square answers and accepts our token. Used by <see cref="Features.Health.Checks.SquareHealthCheck"/>.</summary>
    Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken);

    Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken);

    Task<BookingProfile> GetBookingProfileAsync(string locationId, CancellationToken cancellationToken);

    /// <summary>Every catalog service variation open for online booking. <see cref="BookableServiceResolver"/> picks the shop's one.</summary>
    Task<List<BookableService>> GetBookableServicesAsync(CancellationToken cancellationToken);

    Task<List<TimeSlot>> SearchAvailableTimeSlotsAsync(string locationId, BookableService bookableService, DateTimeRange dateTimeRange, CancellationToken cancellationToken);

    /// <summary>The oldest Square customer with this E.164 phone; Square can hold duplicates.</summary>
    Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken);

    Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken);

    Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken);

    Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken);

    Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken);
}
