using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Features.Availability.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Availability.Services;

/// <summary>
/// Open times for the shop's one service, from Thad's whole Square calendar. Never cached: a time booked anywhere should
/// disappear right away, and <c>CreateBooking</c> re-checks anyway (#27). Dates are calendar days in the shop's timezone.
/// </summary>
public sealed class AvailabilityService(ISquareService square, BookableServiceResolver resolver, TimeProvider time)
{
    /// <summary>The days in the month of <paramref name="month"/> with at least one open time.</summary>
    public async Task<List<DateOnly>> GetAvailableDatesAsync(DateOnly month, CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        TimeZoneInfo shopTimeZone = TimeZoneInfo.FindSystemTimeZoneById(shopDetails.TimeZone);
        DateOnly firstDay = new(month.Year, month.Month, 1);
        DateTimeRange monthRange = new(
            shopTimeZone.GetDayRange(firstDay).Start,
            shopTimeZone.GetDayRange(firstDay.AddMonths(1)).Start
        );

        List<TimeSlot> timeSlots = await SearchWithinBookingWindowAsync(shopDetails.LocationId, monthRange, cancellationToken);

        return timeSlots.Select(timeSlot => shopTimeZone.ToLocalDate(timeSlot.StartAt)).Distinct().Order().ToList();
    }

    public async Task<List<DateTimeOffset>> GetAvailableTimesAsync(DateOnly date, CancellationToken cancellationToken)
    {
        ShopDetails shopDetails = await square.GetShopDetailsAsync(cancellationToken);
        TimeZoneInfo shopTimeZone = TimeZoneInfo.FindSystemTimeZoneById(shopDetails.TimeZone);

        List<TimeSlot> timeSlots = await SearchWithinBookingWindowAsync(shopDetails.LocationId, shopTimeZone.GetDayRange(date), cancellationToken);

        return timeSlots.Select(timeSlot => timeSlot.StartAt).ToList();
    }

    /// <summary>Starting the search at now plus the minimum notice is also what leaves out today's past times.</summary>
    private async Task<List<TimeSlot>> SearchWithinBookingWindowAsync(string locationId, DateTimeRange requestedRange, CancellationToken cancellationToken)
    {
        BookingProfile bookingProfile = await square.GetBookingProfileAsync(locationId, cancellationToken);
        DateTimeOffset now = time.GetUtcNow();
        DateTimeRange bookingWindow = new(
            now + bookingProfile.MinimumNotice,
            now + bookingProfile.MaximumAdvance
        );

        DateTimeRange searchRange = requestedRange.Intersect(bookingWindow)
            ?? throw new OutsideBookingWindowException($"{requestedRange} doesn't overlap the booking window {bookingWindow}.");
        BookableService bookableService = await resolver.ResolveAsync(cancellationToken);

        return await square.SearchAvailableTimeSlotsAsync(locationId, bookableService, searchRange, cancellationToken);
    }
}
