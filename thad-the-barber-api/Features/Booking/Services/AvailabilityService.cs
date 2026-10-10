using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Booking.Services;

/// <summary>
/// Open times for the shop's one service, from Thad's whole Square calendar. Never cached: a time booked anywhere should
/// disappear right away, and <c>CreateBooking</c> re-checks anyway (#27).
/// </summary>
public sealed class AvailabilityService(ISquareService square, BookableServiceResolver resolver, TimeProvider time)
{
    /// <summary>
    /// The days in the month of <paramref name="month"/> (shop timezone) with their open times, leaving out days with
    /// none. The search starts at now plus the minimum notice, which also leaves out today's past times.
    /// </summary>
    public async Task<List<AvailableDay>> GetAvailableDaysAsync(DateOnly month, CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        BookingProfile bookingProfile = await square.GetBookingProfileAsync(shopDetails.LocationId, cancellationToken);
        TimeZoneInfo shopTimeZone = TimeZoneInfo.FindSystemTimeZoneById(shopDetails.TimeZone);
        DateTimeRange monthRange = shopTimeZone.GetMonthRange(month);
        DateTimeOffset now = time.GetUtcNow();
        DateTimeRange bookingWindow = new(
            now + bookingProfile.MinimumNotice,
            now + bookingProfile.MaximumAdvance
        );

        DateTimeRange searchRange = monthRange.Intersect(bookingWindow)
            ?? throw new OutsideBookingWindowException($"{monthRange} doesn't overlap the booking window {bookingWindow}.");
        BookableService bookableService = await resolver.ResolveAsync(cancellationToken);
        List<TimeSlot> timeSlots = await square.SearchAvailableTimeSlotsAsync(shopDetails.LocationId, bookableService, searchRange, cancellationToken);

        return timeSlots
            .OrderBy(timeSlot => timeSlot.StartAt)
            .GroupBy(timeSlot => shopTimeZone.ToLocalDate(timeSlot.StartAt))
            .Select(day => new AvailableDay(
                day.Key,
                [.. day.Select(timeSlot => timeSlot.StartAt)]
            ))
            .ToList();
    }
}
