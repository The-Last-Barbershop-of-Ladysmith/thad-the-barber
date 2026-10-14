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

    /// <summary>Every Square customer with this E.164 phone, oldest first; Square can hold duplicates.</summary>
    Task<List<string>> FindCustomerIdsAsync(string phone, CancellationToken cancellationToken);

    Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken);

    Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken);

    /// <summary>The time slot held by the customer's pending or accepted booking starting at <paramref name="startAt"/>, if any.</summary>
    Task<TimeSlot?> FindBookedTimeSlotAsync(string locationId, string customerId, DateTimeOffset startAt, CancellationToken cancellationToken);

    /// <summary>The customer's bookings at the location starting within <paramref name="dateTimeRange"/>, whatever their status.</summary>
    Task<List<Appointment>> ListCustomerAppointmentsAsync(string locationId, string customerId, DateTimeRange dateTimeRange, CancellationToken cancellationToken);

    /// <summary>The booking with this id, or null when Square has none.</summary>
    Task<Appointment?> GetBookingAsync(string bookingId, CancellationToken cancellationToken);

    Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken);

    Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken);
}
