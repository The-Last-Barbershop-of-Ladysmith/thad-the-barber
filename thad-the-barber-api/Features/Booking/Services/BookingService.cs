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

        string? existingCustomerId = await square.FindCustomerIdAsync(request.Phone, cancellationToken);
        if (existingCustomerId is not null)
        {
            await EnsureBelowLimitAsync(existingCustomerId, cancellationToken);
        }

        string customerId = existingCustomerId
            ?? await square.CreateCustomerAsync(request.Name, request.Phone, idempotencyKey, cancellationToken);
        Appointment appointment = await square.CreateBookingAsync(customerId, openTimeSlot, idempotencyKey, cancellationToken);

        return appointment.ToBookingConfirmationDto(manageTokens.Sign(appointment.Id));
    }

    /// <summary>
    /// BR-13: every upcoming booking counts, wherever it was made, up to the furthest a customer can book ahead. Two
    /// attempts racing at one below the cap can both pass; for one barber's calendar that's not worth a lock.
    /// </summary>
    private async Task EnsureBelowLimitAsync(string customerId, CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        BookingProfile bookingProfile = await square.GetBookingProfileAsync(shopDetails.LocationId, cancellationToken);
        DateTimeOffset now = time.GetUtcNow();
        DateTimeRange upcoming = new(
            now,
            now + bookingProfile.MaximumAdvance
        );

        List<Appointment> appointments = await square.ListCustomerAppointmentsAsync(shopDetails.LocationId, customerId, upcoming, cancellationToken);
        int upcomingCount = appointments.Count(appointment => appointment.IsUpcomingAt(now));
        if (upcomingCount >= settings.Value.MaxUpcomingPerPhone)
        {
            throw new BookingLimitReachedException($"The customer holds {upcomingCount} upcoming appointments.");
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
        string customerId = await square.FindCustomerIdAsync(request.Phone, cancellationToken)
            ?? await square.CreateCustomerAsync(request.Name, request.Phone, idempotencyKey, cancellationToken);
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        TimeSlot bookedTimeSlot = await square.FindBookedTimeSlotAsync(shopDetails.LocationId, customerId, request.StartAt, cancellationToken)
            ?? throw new SlotUnavailableException("The time is taken or outside the booking window.");
        Appointment appointment = await square.CreateBookingAsync(customerId, bookedTimeSlot, idempotencyKey, cancellationToken);

        return appointment.ToBookingConfirmationDto(manageTokens.Sign(appointment.Id));
    }
}
