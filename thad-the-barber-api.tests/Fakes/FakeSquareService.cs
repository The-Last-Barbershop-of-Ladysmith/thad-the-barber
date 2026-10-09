using Square;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.Square;

namespace ThadTheBarber.Api.Tests.Fakes;

/// <summary>
/// Stands in for Square in every test (see <see cref="ApiFactory"/>). Each <see cref="ISquareService"/> method returns
/// a settable value that defaults to fixture data, so a test configures only what it checks.
/// </summary>
public sealed class FakeSquareService : ISquareService
{
    private int _checks;

    public SquareConnection Connection { get; init; } = SquareConnection.Connected;

    public ShopDetails ShopDetails { get; init; } =
        SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location!.ToShopDetails();

    public BookingProfile BookingProfile { get; init; } =
        SquareFixture.ReadAs<GetBusinessBookingProfileResponse>("business-booking-profile.json").BusinessBookingProfile!
            .ToBookingProfile(SquareFixture.ReadAs<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single());

    public BookableService BookableService { get; init; } =
        SquareFixture.ReadAs<SearchCatalogItemsResponse>("search-catalog-items.json").Items!.SelectMany(item => item.ToBookableServices()).Single();

    public List<TimeSlot> TimeSlots { get; init; } =
        [.. SquareFixture.ReadAs<SearchAvailabilityResponse>("search-availability.json").Availabilities!.Select(availability => availability.ToTimeSlot())];

    public string? CustomerId { get; init; } =
        SquareFixture.ReadAs<SearchCustomersResponse>("search-customers-by-phone.json").Customers!.First().Id;

    public string CreatedCustomerId { get; init; } =
        SquareFixture.ReadAs<CreateCustomerResponse>("create-customer.json").Customer!.Id!;

    public Appointment CreatedAppointment { get; init; } =
        SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!.ToAppointment();

    public Appointment CancelledAppointment { get; init; } =
        SquareFixture.ReadAs<CancelBookingResponse>("cancel-booking.json").Booking!.ToAppointment();

    public Appointment RescheduledAppointment { get; init; } =
        SquareFixture.ReadAs<UpdateBookingResponse>("update-booking.json").Booking!.ToAppointment();

    public int Checks => _checks;

    public Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _checks);
        return Task.FromResult(Connection);
    }

    public Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken) => Task.FromResult(ShopDetails);

    public Task<BookingProfile> GetBookingProfileAsync(string locationId, CancellationToken cancellationToken) => Task.FromResult(BookingProfile);

    public Task<BookableService> GetBookableServiceAsync(CancellationToken cancellationToken) => Task.FromResult(BookableService);

    public Task<List<TimeSlot>> SearchAvailableTimeSlotsAsync(string locationId, BookableService bookableService, DateTimeRange dateTimeRange, CancellationToken cancellationToken) =>
        Task.FromResult(TimeSlots.Where(timeSlot => timeSlot.StartAt >= dateTimeRange.Start && timeSlot.StartAt < dateTimeRange.End).ToList());

    public Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken) => Task.FromResult(CustomerId);

    public Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken) => Task.FromResult(CreatedCustomerId);

    public Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken) =>
        Task.FromResult(CreatedAppointment);

    public Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken) =>
        Task.FromResult(CancelledAppointment);

    public Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken) =>
        Task.FromResult(RescheduledAppointment);
}
