using System.Globalization;
using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Booking.Endpoints;

public static class BookingEndpoints
{
    public static IServiceCollection AddBooking(this IServiceCollection services) =>
        services.AddSingleton<AvailabilityService>();

    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder bookings = api.MapGroup("/bookings")
            .WithTags("Booking")
            .NoStore();
        bookings.MapGet("/availability", GetAvailabilityAsync)
            .WithName("GetAvailability");
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
}
