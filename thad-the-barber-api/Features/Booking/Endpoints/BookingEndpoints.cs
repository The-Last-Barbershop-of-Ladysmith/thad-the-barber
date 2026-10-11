using System.Globalization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;

namespace ThadTheBarber.Api.Features.Booking.Endpoints;

public static class BookingEndpoints
{
    public static IServiceCollection AddBooking(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ManageLinkSettings>()
            .Bind(configuration.GetSection(ManageLinkSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<ManageLinkSettings>, ManageLinkSettingsValidator>();
        services.AddSingleton<ManageTokenSigner>();
        services.AddSingleton<AvailabilityService>();
        services.AddSingleton<BookingService>();
        return services;
    }

    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder api)
    {
        RouteGroupBuilder bookings = api.MapGroup("/bookings")
            .WithTags("Booking")
            .NoStore();
        bookings.MapGet("/availability", GetAvailabilityAsync)
            .WithName("GetAvailability");
        bookings.MapPost("", CreateBookingAsync)
            .WithName("CreateBooking");
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
}
