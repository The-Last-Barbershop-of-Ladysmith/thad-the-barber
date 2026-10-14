using System.Globalization;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Booking.Services;

/// <summary>
/// The clock sits at 11:10 shop time on 2026-10-06, with the fixture's open times on the following days; see
/// <c>AvailabilityServiceTests</c>. The fake Square books like Square does (see <see cref="FakeSquareService"/>).
/// </summary>
public sealed class BookingServiceTests
{
    private static readonly DateTimeOffset now = Instant("2026-10-06T15:10:00Z");
    private static readonly DateTimeOffset openTime = Instant("2026-10-07T13:30:00Z");
    private const int MaxUpcomingPerPhone = 3;

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AnExistingCustomerIsBookedWithoutCreatingAnother()
    {
        FakeSquareService square = new();

        BookingConfirmation confirmation = await Service(square).BookAsync(Request(openTime), Cancellation);

        FakeBooking booking = Assert.Single(square.Bookings);
        Assert.Equal(0, square.CustomersCreated);
        Assert.Equal(square.CustomerId, booking.CustomerId);
        Assert.Equal(booking.Appointment.Id, confirmation.Id);
        Assert.Equal(openTime, confirmation.StartAt);
        Assert.True(ManageTokens.Signer.IsValid(confirmation.Id, confirmation.ManageToken));
    }

    [Fact]
    public async Task AMissingCustomerIsCreatedAndBooked()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
        };

        await Service(square).BookAsync(Request(openTime), Cancellation);

        Assert.Equal(1, square.CustomersCreated);
        Assert.Equal(square.CreatedCustomerId, Assert.Single(square.Bookings).CustomerId);
    }

    [Fact]
    public async Task TheBookingAndItsCustomerShareTheAttemptsIdempotencyKey()
    {
        FakeSquareService square = new();
        BookingRequest request = Request(openTime);

        await Service(square).BookAsync(request, Cancellation);

        Assert.Equal(request.IdempotencyKey.ToString(), Assert.Single(square.Bookings).IdempotencyKey);
    }

    [Theory]
    [InlineData(true, 0)]
    [InlineData(false, 1)]
    public async Task TheSameAttemptTwiceBooksOnceAndConfirmsBoth(bool isCustomerKnown, int customersCreated)
    {
        FakeSquareService square = Square(isCustomerKnown);
        BookingService service = Service(square);
        BookingRequest request = Request(openTime);

        BookingConfirmation first = await service.BookAsync(request, Cancellation);
        BookingConfirmation retried = await service.BookAsync(request, Cancellation);

        Assert.Single(square.Bookings);
        Assert.Equal(customersCreated, square.CustomersCreated);
        Assert.Equal(first, retried);
    }

    [Fact]
    public async Task ARetryBeforeSquareCanSearchTheNewCustomerStillConfirms()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
            IsNewCustomerSearchable = false,
        };
        BookingService service = Service(square);
        BookingRequest request = Request(openTime);

        BookingConfirmation first = await service.BookAsync(request, Cancellation);
        BookingConfirmation retried = await service.BookAsync(request, Cancellation);

        Assert.Single(square.Bookings);
        Assert.Equal(first, retried);
    }

    [Fact]
    public async Task AnotherAttemptAtTheCustomersOwnBookedTimeIsUnavailable()
    {
        FakeSquareService square = new();
        BookingService service = Service(square);
        await service.BookAsync(Request(openTime), Cancellation);

        await Assert.ThrowsAsync<SlotUnavailableException>(() => service.BookAsync(Request(openTime), Cancellation));
        Assert.Single(square.Bookings);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ATimeThatIsntOpenIsUnavailable(bool isCustomerKnown)
    {
        FakeSquareService square = Square(isCustomerKnown);

        await Assert.ThrowsAsync<SlotUnavailableException>(
            () => Service(square).BookAsync(Request(Instant("2026-10-07T13:15:00Z")), Cancellation));
        Assert.Empty(square.Bookings);
    }

    [Fact]
    public async Task APhoneHoldingTheMaximumUpcomingAppointmentsCantBookAnother()
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));

        await Assert.ThrowsAsync<BookingLimitReachedException>(() => Service(square).BookAsync(Request(openTime), Cancellation));
        Assert.Equal(MaxUpcomingPerPhone, square.Bookings.Count);
    }

    [Fact]
    public async Task APhoneOneBelowTheMaximumCanBook()
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Pending, Instant("2026-11-02T14:00:00Z"));

        await Service(square).BookAsync(Request(openTime), Cancellation);

        Assert.Equal(MaxUpcomingPerPhone, square.Bookings.Count);
    }

    [Theory]
    [InlineData(AppointmentStatus.CancelledByCustomer, "2026-11-20T14:00:00Z")]
    [InlineData(AppointmentStatus.CancelledBySeller, "2026-11-20T14:00:00Z")]
    [InlineData(AppointmentStatus.Declined, "2026-11-20T14:00:00Z")]
    [InlineData(AppointmentStatus.NoShow, "2026-11-20T14:00:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-10-06T15:00:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-10-06T15:10:00Z")]
    public async Task CancelledOrPastAppointmentsDontCountTowardTheMaximum(AppointmentStatus status, string startAt)
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        square.Hold(1, status, Instant(startAt));

        await Service(square).BookAsync(Request(openTime), Cancellation);

        Assert.Equal(MaxUpcomingPerPhone + 1, square.Bookings.Count);
    }

    [Fact]
    public async Task BookingsOfEveryCustomerWithThePhoneCountTowardTheMaximum()
    {
        FakeSquareService square = new()
        {
            DuplicateCustomerIds = ["CUSTOMER0TEST0DUPLICATE01"],
        };
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-11-10T14:00:00Z"), "CUSTOMER0TEST0DUPLICATE01");

        await Assert.ThrowsAsync<BookingLimitReachedException>(() => Service(square).BookAsync(Request(openTime), Cancellation));
    }

    [Fact]
    public async Task ARetryAtTheMaximumWhileSquareStillListsTheTimeConfirmsTheSameBooking()
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        BookingService service = Service(square);
        BookingRequest request = Request(openTime);
        BookingConfirmation first = await service.BookAsync(request, Cancellation);
        square.TimeSlots.Add(square.Bookings[^1].TimeSlot);

        BookingConfirmation retried = await service.BookAsync(request, Cancellation);

        Assert.Equal(first, retried);
        Assert.Equal(MaxUpcomingPerPhone, square.Bookings.Count);
    }

    [Fact]
    public async Task ANewCustomersBookingsArentListed()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
        };

        await Service(square).BookAsync(Request(openTime), Cancellation);

        Assert.Equal(0, square.AppointmentListings);
    }

    [Fact]
    public async Task ARetryOfTheBookingThatReachedTheMaximumStillConfirms()
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        BookingService service = Service(square);
        BookingRequest request = Request(openTime);

        BookingConfirmation first = await service.BookAsync(request, Cancellation);
        BookingConfirmation retried = await service.BookAsync(request, Cancellation);

        Assert.Equal(first, retried);
    }

    private static FakeSquareService Square(bool isCustomerKnown)
    {
        FakeSquareService square = new();
        if (!isCustomerKnown)
        {
            square.CustomerId = null;
        }

        return square;
    }

    private static BookingService Service(FakeSquareService square)
    {
        FakeTimeProvider time = new(now);
        return new BookingService(
            square,
            new AvailabilityService(
                square,
                new BookableServiceResolver(square, Options.Create(new SquareSettings())),
                time
            ),
            ManageTokens.Signer,
            Options.Create(new BookingSettings
            {
                MaxUpcomingPerPhone = MaxUpcomingPerPhone,
            }),
            time
        );
    }

    private static BookingRequest Request(DateTimeOffset startAt) => new(
        startAt,
        "Q Testperson-Example",
        "+15550100187",
        Guid.NewGuid()
    );

    private static DateTimeOffset Instant(string instant) => DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture);
}
