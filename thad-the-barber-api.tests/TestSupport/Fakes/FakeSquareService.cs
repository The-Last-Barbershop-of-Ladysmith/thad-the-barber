using Square;
using ThadTheBarber.Api.Common.Models;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// Stands in for Square in every test (see <see cref="ApiFactory"/>). Each <see cref="ISquareService"/> method returns
/// a settable value that defaults to fixture data, so a test configures only what it checks. Customers and bookings
/// behave like Square's: a created customer is found by phone, a booked time leaves <see cref="TimeSlots"/>, booking
/// again with the same idempotency key returns the first booking, and cancelling or rescheduling needs the booking's
/// current version, bumps it and frees the old time.
/// </summary>
public sealed class FakeSquareService : ISquareService
{
    private int _checks;
    private int _catalogSearches;

    public SquareConnection Connection { get; init; } = SquareConnection.Connected;

    public ShopDetails ShopDetails { get; init; } =
        SquareFixture.ReadAs<GetLocationResponse>("retrieve-location.json").Location!.ToShopDetails();

    public BookingProfile BookingProfile { get; init; } =
        SquareFixture.ReadAs<GetBusinessBookingProfileResponse>("business-booking-profile.json").BusinessBookingProfile!
            .ToBookingProfile(SquareFixture.ReadAs<ListLocationBookingProfilesResponse>("location-booking-profiles.json").LocationBookingProfiles!.Single());

    public List<BookableService> BookableServices { get; init; } =
        [.. SquareFixture.ReadAs<SearchCatalogItemsResponse>("search-catalog-items.json").Items!.SelectMany(item => item.ToBookableServices())];

    /// <summary>The fixture's service plus a second variation, which the one-service rule (BR-01) rejects unless one is pinned.</summary>
    public static List<BookableService> TwoBookableServices
    {
        get
        {
            BookableService fixtureService = new FakeSquareService().BookableServices.Single();
            return
            [
                fixtureService,
                fixtureService with
                {
                    VariationId = "OTHER-VARIATION",
                },
            ];
        }
    }

    public List<TimeSlot> TimeSlots { get; init; } =
        [.. SquareFixture.ReadAs<SearchAvailabilityResponse>("search-availability.json").Availabilities!.Select(availability => availability.ToTimeSlot())];

    public string? CustomerId { get; set; } =
        SquareFixture.ReadAs<SearchCustomersResponse>("search-customers-by-phone.json").Customers!.First().Id;

    public string CreatedCustomerId { get; init; } =
        SquareFixture.ReadAs<CreateCustomerResponse>("create-customer.json").Customer!.Id!;

    public Appointment CreatedAppointment { get; init; } =
        SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!.ToAppointment();

    public List<FakeBooking> Bookings { get; } = [];

    /// <summary>False makes a created customer unfindable by phone, like Square's search lagging behind a new customer.</summary>
    public bool IsNewCustomerSearchable { get; init; } = true;

    /// <summary>When set, the shop, booking profile and catalog reads throw it, as if Square were down.</summary>
    public Exception? ReadFailure { get; set; }

    public int Checks => _checks;

    public int CatalogSearches => _catalogSearches;

    public int CustomersCreated { get; private set; }

    public Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _checks);
        return Task.FromResult(Connection);
    }

    public Task<ShopDetails> GetShopDetailsAsync(CancellationToken cancellationToken) => FailOr(ShopDetails);

    public Task<BookingProfile> GetBookingProfileAsync(string locationId, CancellationToken cancellationToken) => FailOr(BookingProfile);

    public Task<List<BookableService>> GetBookableServicesAsync(CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _catalogSearches);
        return FailOr(BookableServices);
    }

    public Task<List<TimeSlot>> SearchAvailableTimeSlotsAsync(string locationId, BookableService bookableService, DateTimeRange dateTimeRange, CancellationToken cancellationToken) =>
        Task.FromResult(TimeSlots.Where(timeSlot => timeSlot.StartAt >= dateTimeRange.Start && timeSlot.StartAt < dateTimeRange.End).ToList());

    public Task<string?> FindCustomerIdAsync(string phone, CancellationToken cancellationToken) => Task.FromResult(CustomerId);

    public Task<string> CreateCustomerAsync(string name, string phone, string idempotencyKey, CancellationToken cancellationToken)
    {
        CustomersCreated++;
        if (IsNewCustomerSearchable)
        {
            CustomerId = CreatedCustomerId;
        }

        return Task.FromResult(CreatedCustomerId);
    }

    public Task<Appointment> CreateBookingAsync(string customerId, TimeSlot timeSlot, string idempotencyKey, CancellationToken cancellationToken)
    {
        FakeBooking? replayed = Bookings.Find(booking => booking.IdempotencyKey == idempotencyKey);
        if (replayed is not null)
        {
            if (replayed.CustomerId != customerId || replayed.TimeSlot != timeSlot)
            {
                return Task.FromException<Appointment>(new InvalidOperationException("Square refuses a reused idempotency key with a different request."));
            }

            return Task.FromResult(replayed.Appointment);
        }

        if (!TimeSlots.Remove(timeSlot))
        {
            return Task.FromException<Appointment>(new SlotUnavailableException("The fake's time is taken."));
        }

        Appointment appointment = CreatedAppointment with
        {
            Id = $"bk_test-{Bookings.Count + 1:D4}fk",
            StartAt = timeSlot.StartAt,
        };
        Bookings.Add(new FakeBooking(
            customerId,
            timeSlot,
            idempotencyKey,
            appointment
        ));
        return Task.FromResult(appointment);
    }

    public Task<TimeSlot?> FindBookedTimeSlotAsync(string locationId, string customerId, DateTimeOffset startAt, CancellationToken cancellationToken) =>
        Task.FromResult(Bookings.Find(booking => booking.CustomerId == customerId && booking.TimeSlot.StartAt == startAt)?.TimeSlot);

    public Task<Appointment?> GetBookingAsync(string bookingId, CancellationToken cancellationToken) =>
        Task.FromResult(Bookings.Find(booking => booking.Appointment.Id == bookingId)?.Appointment);

    public Task<Appointment> CancelBookingAsync(string bookingId, int bookingVersion, CancellationToken cancellationToken) =>
        Task.FromResult(UpdateBooking(bookingId, bookingVersion, booking =>
        {
            TimeSlots.Add(booking.TimeSlot);
            return booking with
            {
                Appointment = booking.Appointment with
                {
                    Status = AppointmentStatus.CancelledByCustomer,
                },
            };
        }));

    public Task<Appointment> RescheduleBookingAsync(string bookingId, int bookingVersion, DateTimeOffset newStartAt, CancellationToken cancellationToken)
    {
        TimeSlot? newTimeSlot = TimeSlots.Find(timeSlot => timeSlot.StartAt == newStartAt);
        if (newTimeSlot is null)
        {
            return Task.FromException<Appointment>(new SlotUnavailableException("The fake's new time is taken."));
        }

        return Task.FromResult(UpdateBooking(bookingId, bookingVersion, booking =>
        {
            TimeSlots.Remove(newTimeSlot);
            TimeSlots.Add(booking.TimeSlot);
            return booking with
            {
                TimeSlot = newTimeSlot,
                Appointment = booking.Appointment with
                {
                    StartAt = newStartAt,
                },
            };
        }));
    }

    private Appointment UpdateBooking(string bookingId, int bookingVersion, Func<FakeBooking, FakeBooking> update)
    {
        int index = Bookings.FindIndex(booking => booking.Appointment.Id == bookingId);
        if (index < 0 || Bookings[index].Appointment.Version != bookingVersion)
        {
            throw new InvalidOperationException("Square refuses an unknown booking or a stale version.");
        }

        FakeBooking updated = update(Bookings[index]);
        Bookings[index] = updated with
        {
            Appointment = updated.Appointment with
            {
                Version = bookingVersion + 1,
            },
        };
        return Bookings[index].Appointment;
    }

    private Task<T> FailOr<T>(T value)
    {
        if (ReadFailure is not null)
        {
            return Task.FromException<T>(ReadFailure);
        }

        return Task.FromResult(value);
    }
}
