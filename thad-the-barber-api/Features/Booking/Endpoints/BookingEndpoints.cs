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
        bookings.MapPost("", CreateBookingAsync)
            .WithName("CreateBooking")
            .RequireRateLimiting(RateLimitSetup.BookingPolicy);
        bookings.MapGet("/{id}", GetBookingAsync)
            .WithName("GetBooking");
        bookings.MapPost("/{id}/cancel", CancelBookingAsync)
            .WithName("CancelBooking")
            .RequireRateLimiting(RateLimitSetup.BookingPolicy);
        bookings.MapPost("/{id}/reschedule", RescheduleBookingAsync)
            .WithName("RescheduleBooking")
            .RequireRateLimiting(RateLimitSetup.BookingPolicy);
        return api;
    }

    /// <summary>
    /// The open days in <c>?month=YYYY-MM</c> (shop timezone), each with its open times as UTC instants. Years 1 and
    /// 9999 are rejected because their month ranges in UTC can overflow <see cref="DateTimeOffset"/>.
    /// </summary>
    internal static async Task<Results<Ok<List<AvailableDay>>, ValidationProblem>> GetAvailabilityAsync(
        string month,
        AvailabilityService availability,
        CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly firstDay)
            || firstDay.Year == DateOnly.MinValue.Year
            || firstDay.Year == DateOnly.MaxValue.Year)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(month)] = ["Use YYYY-MM."],
            });
        }

        return TypedResults.Ok(await availability.GetAvailableDaysAsync(firstDay, cancellationToken));
    }

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
