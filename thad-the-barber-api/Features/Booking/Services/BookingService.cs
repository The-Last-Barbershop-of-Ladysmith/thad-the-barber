using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Mappers;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// Books the shop's one service for a customer matched silently by phone (BR-21). The request's idempotency key goes
/// to both <c>CreateCustomer</c> and <c>CreateBooking</c>, so a retried attempt never creates a second of either.
/// </summary>
public sealed class BookingService(
    ISquareService square,
    AvailabilityService availability,
    ManageTokenSigner manageTokens,
    IOptions<BookingSettings> settings,
    TimeProvider time)
{
    public async Task<BookingConfirmation> BookAsync(BookingRequest request, CancellationToken cancellationToken)
    {
        string idempotencyKey = request.IdempotencyKey.ToString();
        TimeSlot? openTimeSlot = await availability.FindTimeSlotAsync(request.StartAt, cancellationToken);
        if (openTimeSlot is null)
        {
            return await ReplayBookingAsync(request, idempotencyKey, cancellationToken);
        }

        List<string> customerIds = await square.FindCustomerIdsAsync(request.Phone, cancellationToken);
        if (customerIds.Count > 0)
        {
            await EnsureBelowLimitAsync(customerIds, request.StartAt, cancellationToken);
        }

        string customerId = customerIds.FirstOrDefault()
            ?? await square.CreateCustomerAsync(request.Name, request.Phone, idempotencyKey, cancellationToken);
        Appointment appointment = await square.CreateBookingAsync(customerId, openTimeSlot, idempotencyKey, cancellationToken);

        return appointment.ToBookingConfirmationDto(manageTokens.Sign(appointment.Id));
    }

    /// <summary>
    /// BR-13: every upcoming booking of every Square customer with the phone counts, wherever it was made, up to the
    /// furthest a customer can book ahead. A booking the phone already holds at <paramref name="startAt"/> lifts the
    /// cap: it's this attempt's own booking while Square's availability still lists the time, and
    /// <c>CreateBooking</c> answers with it for the same key and refuses the time for any other. Two attempts racing at
    /// one below the cap can both pass; for one barber's calendar that's not worth a lock.
    /// </summary>
    private async Task EnsureBelowLimitAsync(List<string> customerIds, DateTimeOffset startAt, CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        BookingProfile bookingProfile = await square.GetBookingProfileAsync(shopDetails.LocationId, cancellationToken);
        DateTimeOffset now = time.GetUtcNow();
        DateTimeRange upcoming = new(
            now,
            now + bookingProfile.MaximumAdvance
        );

        List<Appointment>[] appointmentsByCustomer = await Task.WhenAll(customerIds.Select(customerId =>
            square.ListCustomerAppointmentsAsync(shopDetails.LocationId, customerId, upcoming, cancellationToken)));
        List<Appointment> upcomingAppointments = [.. appointmentsByCustomer
            .SelectMany(appointments => appointments)
            .Where(appointment => appointment.IsUpcomingAt(now))];
        if (upcomingAppointments.Count >= settings.Value.MaxUpcomingPerPhone
            && !upcomingAppointments.Any(appointment => appointment.StartAt == startAt))
        {
            throw new BookingLimitReachedException($"The phone holds {upcomingAppointments.Count} upcoming appointments.");
        }
    }

    /// <summary>
    /// The time is also gone when this attempt already booked it and only the response was lost. Sending the same
    /// <c>CreateBooking</c> again lets Square answer with that booking when the key matches; any other key is a new
    /// booking Square refuses as taken. Returning the found booking directly would hand it to anyone who knows the
    /// customer's phone and time. Square's customer search can lag a few seconds behind a new customer, so the customer
    /// is found or created again with the same key, which Square answers with the first attempt's customer. The cap
    /// isn't checked here: the booking being confirmed already counts toward it.
    /// </summary>
    private async Task<BookingConfirmation> ReplayBookingAsync(BookingRequest request, string idempotencyKey, CancellationToken cancellationToken)
    {
        List<string> customerIds = await square.FindCustomerIdsAsync(request.Phone, cancellationToken);
        string customerId = customerIds.FirstOrDefault()
            ?? await square.CreateCustomerAsync(request.Name, request.Phone, idempotencyKey, cancellationToken);
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        TimeSlot bookedTimeSlot = await square.FindBookedTimeSlotAsync(shopDetails.LocationId, customerId, request.StartAt, cancellationToken)
            ?? throw new SlotUnavailableException("The time is taken or outside the booking window.");
        Appointment appointment = await square.CreateBookingAsync(customerId, bookedTimeSlot, idempotencyKey, cancellationToken);

        return appointment.ToBookingConfirmationDto(manageTokens.Sign(appointment.Id));
    }
}
