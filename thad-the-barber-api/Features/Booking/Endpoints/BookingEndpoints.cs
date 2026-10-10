using System.Globalization;
using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Booking.Endpoints;

public static class BookingEndpoints
{
    public static IServiceCollection AddBooking(this IServiceCollection services) =>
        services.AddSingleton<AvailabilityService>();

    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder availability = api.MapGroup("/availability")
            .WithTags("Availability")
            .NoStore();
        availability.MapGet("/dates", GetAvailableDatesAsync)
            .WithName("GetAvailableDates");
        availability.MapGet("/times", GetAvailableTimesAsync)
            .WithName("GetAvailableTimes");
        return api;
    }

    /// <summary>The days (shop timezone) in <c>?month=YYYY-MM</c> with at least one open time.</summary>
    internal static async Task<Results<Ok<List<DateOnly>>, ValidationProblem>> GetAvailableDatesAsync(
        string month,
        AvailabilityService availability,
        CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly firstDay))
        {
            return Invalid(nameof(month), "Use YYYY-MM.");
        }

        return TypedResults.Ok(await availability.GetAvailableDatesAsync(firstDay, cancellationToken));
    }

    /// <summary>The open start times, as UTC instants, on <c>?date=YYYY-MM-DD</c> (a day in the shop's timezone).</summary>
    internal static async Task<Results<Ok<List<DateTimeOffset>>, ValidationProblem>> GetAvailableTimesAsync(
        string date,
        AvailabilityService availability,
        CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly day))
        {
            return Invalid(nameof(date), "Use YYYY-MM-DD.");
        }

        return TypedResults.Ok(await availability.GetAvailableTimesAsync(day, cancellationToken));
    }

    private static ValidationProblem Invalid(string parameter, string error) =>
        TypedResults.ValidationProblem(new Dictionary<string, string[]>
        {
            [parameter] = [error],
        });
}
