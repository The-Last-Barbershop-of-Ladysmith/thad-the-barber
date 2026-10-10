using System.Globalization;
using Azure;
using Azure.Identity;
using Square;
using Square.Bookings;
using Square.Bookings.LocationProfiles;
using Square.Catalog;
using Square.Core;
using Square.Customers;
using Square.Locations;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// The shop's details, booking profile and bookable services go through <see cref="SquareCache"/>; availability and
/// booking calls always reach Square.
/// </summary>
public sealed class SquareService : ISquareService
{
    private const string MainLocationId = "main";
    private const string ShopDetailsKey = "square:shop-details";
    private const string BookingProfileKeyPrefix = "square:booking-profile:";
    private const string BookableServicesKey = "square:bookable-services";
    private static readonly TimeSpan minimumAvailabilitySearchLength = TimeSpan.FromHours(24);

    private readonly SquareClient squareClient;
    private readonly SquareCache squareCache;

    public SquareService(SquareClient squareClient, SquareCache squareCache)
    {
        this.squareClient = squareClient;
        this.squareCache = squareCache;
    }

    public async Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        try
        {
            await squareClient.OAuth.RetrieveTokenStatusAsync(cancellationToken: cancellationToken);
            return SquareConnection.Connected;
        }
        catch (Exception exception) when (exception is SquareNotConnectedException or SquareApiException { StatusCode: StatusCodes.Status401Unauthorized })
        {
            return SquareConnection.NotConnected;
        }
        catch (Exception exception) when (exception is SquareException or HttpRequestException
            or RequestFailedException or AuthenticationFailedException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return SquareConnection.Unreachable;
        }
    }

    public Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken) =>
        squareCache.GetOrRefreshAsync(ShopDetailsKey, () => FetchShopDetailsAsync(cancellationToken), cancellationToken);

    public Task<BookingProfile> GetBookingProfileAsync(string locationId, CancellationToken cancellationToken) =>
        squareCache.GetOrRefreshAsync(
            BookingProfileKeyPrefix + locationId,
            () => FetchBookingProfileAsync(locationId, cancellationToken),
            cancellationToken);

    public Task<List<BookableService>> GetBookableServicesAsync(CancellationToken cancellationToken) =>
        squareCache.GetOrRefreshAsync(BookableServicesKey, () => FetchBookableServicesAsync(cancellationToken), cancellationToken);

    /// <summary>
    /// Square rejects ranges shorter than 24 hours, and a day with a DST jump has 23, so the search covers at least 24
    /// hours and drops what falls outside <paramref name="dateTimeRange"/>.
    /// </summary>
    public async Task<List<TimeSlot>> SearchAvailableTimeSlotsAsync(string locationId, BookableService bookableService, DateTimeRange dateTimeRange, CancellationToken cancellationToken)
    {
        DateTimeOffset searchEndAt = dateTimeRange.End;
        if (dateTimeRange.End - dateTimeRange.Start < minimumAvailabilitySearchLength)
        {
            searchEndAt = dateTimeRange.Start + minimumAvailabilitySearchLength;
        }

        SearchAvailabilityRequest availabilityRequest = new()
        {
            Query = new SearchAvailabilityQuery
            {
                Filter = new SearchAvailabilityFilter
                {
                    StartAtRange = new TimeRange
                    {
                        StartAt = ToSquareTime(dateTimeRange.Start),
                        EndAt = ToSquareTime(searchEndAt),
                    },
                    LocationId = locationId,
                    SegmentFilters = [new SegmentFilter { ServiceVariationId = bookableService.VariationId }],
                },
            },
        };

        SearchAvailabilityResponse availabilityResponse = await squareClient.Bookings.SearchAvailabilityAsync(availabilityRequest, cancellationToken: cancellationToken);

        return (availabilityResponse.Availabilities ?? [])
            .Select(availability => availability.ToTimeSlot())
            .Where(timeSlot => timeSlot.StartAt >= dateTimeRange.Start && timeSlot.StartAt < dateTimeRange.End)
            .ToList();
    }

    public async Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken)
    {
        SearchCustomersRequest customerSearchRequest = new()
        {
            Query = new CustomerQuery
            {
                Filter = new CustomerFilter
                {
                    PhoneNumber = new CustomerTextFilter
                    {
                        Exact = phone,
                    },
                },
                Sort = new CustomerSort
                {
                    Field = CustomerSortField.CreatedAt,
                    Order = SortOrder.Asc,
                },
            },
            Limit = 1,
        };

        SearchCustomersResponse customerSearchResponse = await squareClient.Customers.SearchAsync(customerSearchRequest, cancellationToken: cancellationToken);

        return customerSearchResponse.Customers?.FirstOrDefault()?.Id;
    }

    /// <summary>
    /// The site asks for one name (BR-09); its first word becomes Square's given name and the rest the family name.
    /// Passing the booking attempt's idempotency key means a retried attempt doesn't create a second customer.
    /// </summary>
    public async Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken)
    {
        string[] nameWords = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (nameWords.Length == 0)
        {
            throw new InvalidCustomerDetailsException("A customer needs a name.");
        }

        string? familyName = null;
        if (nameWords.Length > 1)
        {
            familyName = string.Join(' ', nameWords[1..]);
        }

        CreateCustomerRequest createCustomerRequest = new()
        {
            IdempotencyKey = idempotencyKey,
            GivenName = nameWords[0],
            FamilyName = familyName,
            PhoneNumber = phone,
        };

        CreateCustomerResponse createCustomerResponse;
        try
        {
            createCustomerResponse = await squareClient.Customers.CreateAsync(createCustomerRequest, cancellationToken: cancellationToken);
        }
        catch (SquareApiException exception) when (IsCustomerInputRejected(exception))
        {
            throw new InvalidCustomerDetailsException("Square rejected the customer's name or phone.", exception);
        }

        return createCustomerResponse.Customer?.Id ?? throw new InvalidOperationException("Square created a customer without an id.");
    }

    public async Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken)
    {
        CreateBookingRequest createBookingRequest = new()
        {
            IdempotencyKey = idempotencyKey,
            Booking = new Booking
            {
                CustomerId = customerId,
                LocationId = timeSlot.LocationId,
                StartAt = ToSquareTime(timeSlot.StartAt),
                AppointmentSegments =
                [
                    new AppointmentSegment
                    {
                        TeamMemberId = timeSlot.TeamMemberId,
                        ServiceVariationId = timeSlot.ServiceVariationId,
                        ServiceVariationVersion = timeSlot.ServiceVariationVersion,
                    },
                ],
            },
        };

        CreateBookingResponse createBookingResponse;
        try
        {
            createBookingResponse = await squareClient.Bookings.CreateAsync(createBookingRequest, cancellationToken: cancellationToken);
        }
        catch (SquareApiException exception) when (IsSlotTaken(exception))
        {
            throw new SlotUnavailableException("Square says the time is no longer available.", exception);
        }

        Booking createdBooking = createBookingResponse.Booking ?? throw new InvalidOperationException("Square returned no booking.");

        return createdBooking.ToAppointment();
    }

    public async Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken)
    {
        CancelBookingRequest cancelBookingRequest = new()
        {
            BookingId = bookingId,
            BookingVersion = bookingVersion,
            IdempotencyKey = Guid.NewGuid().ToString(),
        };

        CancelBookingResponse cancelBookingResponse = await squareClient.Bookings.CancelAsync(cancelBookingRequest, cancellationToken: cancellationToken);
        Booking cancelledBooking = cancelBookingResponse.Booking ?? throw new InvalidOperationException("Square returned no booking.");

        return cancelledBooking.ToAppointment();
    }

    /// <summary>Square moves the booking with only its version and new start (#21); the service and barber stay.</summary>
    public async Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken)
    {
        UpdateBookingRequest updateBookingRequest = new()
        {
            BookingId = bookingId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Booking = new Booking
            {
                Version = bookingVersion,
                StartAt = ToSquareTime(newStartAt),
            },
        };

        UpdateBookingResponse updateBookingResponse;
        try
        {
            updateBookingResponse = await squareClient.Bookings.UpdateAsync(updateBookingRequest, cancellationToken: cancellationToken);
        }
        catch (SquareApiException exception) when (IsSlotTaken(exception))
        {
            throw new SlotUnavailableException("Square says the new time is no longer available.", exception);
        }

        Booking rescheduledBooking = updateBookingResponse.Booking ?? throw new InvalidOperationException("Square returned no booking.");

        return rescheduledBooking.ToAppointment();
    }

    private async Task<ShopDetails> FetchShopDetailsAsync(CancellationToken cancellationToken)
    {
        GetLocationsRequest locationRequest = new()
        {
            LocationId = MainLocationId,
        };

        GetLocationResponse locationResponse = await squareClient.Locations.GetAsync(locationRequest, cancellationToken: cancellationToken);
        Location location = locationResponse.Location ?? throw new InvalidOperationException("Square returned no location.");

        return location.ToShopDetails();
    }

    private async Task<BookingProfile> FetchBookingProfileAsync(string locationId, CancellationToken cancellationToken)
    {
        Task<GetBusinessBookingProfileResponse> businessProfileTask = squareClient.Bookings.GetBusinessProfileAsync(cancellationToken: cancellationToken);
        Task<LocationBookingProfile?> locationProfileTask = FindLocationProfileAsync(locationId, cancellationToken);
        await Task.WhenAll(businessProfileTask, locationProfileTask);

        BusinessBookingProfile businessProfile = businessProfileTask.Result.BusinessBookingProfile
            ?? throw new InvalidOperationException("Square returned no business booking profile.");

        return businessProfile.ToBookingProfile(locationProfileTask.Result);
    }

    private async Task<List<BookableService>> FetchBookableServicesAsync(CancellationToken cancellationToken)
    {
        SearchCatalogItemsRequest catalogRequest = new()
        {
            ProductTypes = [CatalogItemProductType.AppointmentsService]
        };

        SearchCatalogItemsResponse catalogResponse = await squareClient.Catalog.SearchItemsAsync(catalogRequest, cancellationToken: cancellationToken);

        return (catalogResponse.Items ?? []).SelectMany(catalogItem => catalogItem.ToBookableServices()).ToList();
    }

    private async Task<LocationBookingProfile?> FindLocationProfileAsync(string locationId, CancellationToken cancellationToken)
    {
        Pager<LocationBookingProfile> locationProfiles = await squareClient.Bookings.LocationProfiles.ListAsync(
            new ListLocationProfilesRequest(),
            cancellationToken: cancellationToken);

        return await locationProfiles.FirstOrDefaultAsync(locationProfile => locationProfile.LocationId == locationId, cancellationToken);
    }

    /// <summary>
    /// Square answers a taken time with a plain 400 on <c>start_at</c> (#21), not a 409. We format <c>start_at</c>
    /// ourselves, so a 400 on it means the time, not the request.
    /// </summary>
    private static bool IsSlotTaken(SquareApiException exception) =>
        exception.StatusCode == StatusCodes.Status400BadRequest
        && exception.Errors.Any(error => error.Field is "start_at" or "booking.start_at");

    private static bool IsCustomerInputRejected(SquareApiException exception) =>
        exception.StatusCode == StatusCodes.Status400BadRequest
        && exception.Errors.Any(error => error.Field is "given_name" or "family_name" or "phone_number");

    private static string ToSquareTime(DateTimeOffset instant) =>
        instant.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
}
