using System.Globalization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Features.Booking.Endpoints;

public static class BookingEndpoints
{
    public const string ManageTokenHeader = "X-Manage-Token";

    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder bookings = api.MapGroup("/bookings")
            .WithTags("Booking")
            .NoStore();
        bookings.MapGet("/availability", GetAvailabilityAsync)
            .WithName("GetAvailability");
        bookings.MapGet("/next", GetNextTimesAsync)
            .AllowAnonymous()
            .WithName("GetNextTimes")
            .RequireRateLimiting(RateLimitSetup.NextTimesPolicy);
        bookings.MapPost("", CreateBookingAsync)
            .WithName("CreateBooking")
            .RequireRateLimiting(RateLimitSetup.BookingPolicy);
        bookings.MapPost("/lookup/start", StartLookupAsync)
            .WithName("StartBookingLookup")
            .RequireRateLimiting(RateLimitSetup.LookupStartPolicy);
        bookings.MapPost("/lookup/verify", VerifyLookupAsync)
            .WithName("VerifyBookingLookup")
            .RequireRateLimiting(RateLimitSetup.LookupVerifyPolicy);
        bookings.MapGet("/{id}", GetBookingAsync)
            .WithName("GetBooking");
        bookings.MapPost("/{id}/cancel", CancelBookingAsync)
            .WithName("CancelBooking")
            .RequireRateLimiting(RateLimitSetup.ManagePolicy);
        bookings.MapPost("/{id}/reschedule", RescheduleBookingAsync)
            .WithName("RescheduleBooking")
            .RequireRateLimiting(RateLimitSetup.ManagePolicy);
        return api;
    }

    /// <summary>
    /// The open days from <c>?from=</c> through <c>?to=</c> (<c>YYYY-MM-DD</c>, both included, shop timezone), each
    /// with its open times as UTC instants; at most <see cref="AvailabilityService.MaxDayCount"/> days, one Square
    /// search. Years 1 and 9999 are rejected because their day ranges in UTC can overflow <see cref="DateTimeOffset"/>.
    /// </summary>
    internal static async Task<Results<Ok<List<AvailableDay>>, ValidationProblem>> GetAvailabilityAsync(
        string from,
        string to,
        AvailabilityService availability,
        CancellationToken cancellationToken)
    {
        Dictionary<string, string[]> errors = [];
        if (!TryParseDay(from, out DateOnly firstDay))
        {
            errors[nameof(from)] = ["Use YYYY-MM-DD."];
        }

        if (!TryParseDay(to, out DateOnly lastDay))
        {
            errors[nameof(to)] = ["Use YYYY-MM-DD."];
        }
        else if (errors.Count == 0 && (lastDay < firstDay || lastDay.DayNumber - firstDay.DayNumber >= AvailabilityService.MaxDayCount))
        {
            errors[nameof(to)] = [$"Use a day from {nameof(from)} to {AvailabilityService.MaxDayCount} days later."];
        }

        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        return TypedResults.Ok(await availability.GetAvailableDaysAsync(firstDay, lastDay, cancellationToken));
    }

    /// <summary>
    /// The next <c>?count=</c> open times (1 to <see cref="NextTimesService.MaxCount"/>) as UTC instants, earliest
    /// first. Needs no session token, so a home page view spends no bot check; the times are shared between visitors
    /// for <see cref="Configuration.BookingSettings.NextTimesCacheFor"/>.
    /// </summary>
    internal static async Task<Results<Ok<List<DateTimeOffset>>, ValidationProblem>> GetNextTimesAsync(
        int count,
        NextTimesService nextTimes,
        CancellationToken cancellationToken)
    {
        if (count < 1 || count > NextTimesService.MaxCount)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(count)] = [$"Use a number from 1 to {NextTimesService.MaxCount}."],
            });
        }

        return TypedResults.Ok(await nextTimes.GetNextAsync(count, cancellationToken));
    }

    private static bool TryParseDay(string text, out DateOnly day) =>
        DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out day)
        && day.Year != DateOnly.MinValue.Year
        && day.Year != DateOnly.MaxValue.Year;

    /// <summary>
    /// Books the time for the customer. A taken time is 409 <c>slot_unavailable</c>; the request itself is checked by
    /// <see cref="BookingRequest"/>'s attributes before this runs.
    /// </summary>
    internal static async Task<Created<BookingConfirmation>> CreateBookingAsync(
        BookingRequest request,
        BookingService booking,
        CancellationToken cancellationToken) =>
        TypedResults.Created((string?)null, await booking.BookAsync(request, cancellationToken));

    /// <summary>
    /// Texts a code to the phone. Always 202, whether or not the phone has bookings, so it can't be used to find out who
    /// books here (BR-20); a phone asked too often is 429 <c>rate_limited</c>.
    /// </summary>
    internal static async Task<Accepted> StartLookupAsync(
        LookupStartRequest request,
        BookingService booking,
        CancellationToken cancellationToken)
    {
        await booking.StartLookupAsync(request.Phone, cancellationToken);
        return TypedResults.Accepted((string?)null);
    }

    internal static async Task<Ok<List<FoundBooking>>> VerifyLookupAsync(
        LookupVerifyRequest request,
        BookingService booking,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await booking.VerifyLookupAsync(request, cancellationToken));

    /// <summary>
    /// The booking's time and whether it can still change. The manage token comes only from the
    /// <c>X-Manage-Token</c> header, never the query string, so it stays out of server logs; a missing or wrong one is
    /// 404 <c>booking_not_found</c>.
    /// </summary>
    internal static async Task<Ok<ManagedBooking>> GetBookingAsync(
        string id,
        [FromHeader(Name = ManageTokenHeader)] string? manageToken,
        ManageBookingService manageBooking,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await manageBooking.GetAsync(id, manageToken, cancellationToken));

    /// <summary>Cancels the booking; 409 <c>booking_started</c> once its start time has passed.</summary>
    internal static async Task<Ok<ManagedBooking>> CancelBookingAsync(
        string id,
        [FromHeader(Name = ManageTokenHeader)] string? manageToken,
        ManageBookingService manageBooking,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await manageBooking.CancelAsync(id, manageToken, cancellationToken));

    /// <summary>
    /// Moves the booking to an open time: 409 <c>slot_unavailable</c> for a taken one, <c>booking_started</c> once the
    /// current start time has passed, and <c>booking_cancelled</c> for a cancelled booking.
    /// </summary>
    internal static async Task<Ok<ManagedBooking>> RescheduleBookingAsync(
        string id,
        [FromHeader(Name = ManageTokenHeader)] string? manageToken,
        RescheduleRequest request,
        ManageBookingService manageBooking,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await manageBooking.RescheduleAsync(id, manageToken, request, cancellationToken));
}
