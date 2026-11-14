using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Features.Booking.Configuration;
using ThadTheBarber.Api.Features.Booking.Exceptions;
using ThadTheBarber.Api.Features.Booking.Models;
using ThadTheBarber.Api.Features.Booking.Services;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Services;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Twilio.Exceptions;
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
    private const int MaxTextCodesPerPhone = 2;
    private const int MaxVerifyAttemptsPerPhone = 3;
    private const string KnownPhone = "+15555550123";
    private const string UnknownPhone = "+15555550199";

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
    [InlineData(AppointmentStatus.CancelledByCustomer, "2026-11-05T14:00:00Z")]
    [InlineData(AppointmentStatus.CancelledBySeller, "2026-11-05T14:00:00Z")]
    [InlineData(AppointmentStatus.Declined, "2026-11-05T14:00:00Z")]
    [InlineData(AppointmentStatus.NoShow, "2026-11-05T14:00:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-11-07T13:30:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-12-15T14:00:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-10-06T15:00:00Z")]
    [InlineData(AppointmentStatus.Accepted, "2026-10-06T15:10:00Z")]
    public async Task CancelledPastOrFarOffAppointmentsDontCountTowardTheMaximum(AppointmentStatus status, string startAt)
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        square.Hold(1, status, Instant(startAt));

        await Service(square).BookAsync(Request(openTime), Cancellation);

        Assert.Equal(MaxUpcomingPerPhone + 1, square.Bookings.Count);
    }

    /// <summary>
    /// Bookings the day before and the afternoon of the requested time, plus one about a month on: the 31 days from the
    /// first booking hold the maximum only when the last one starts before that stretch ends.
    /// </summary>
    [Theory]
    [InlineData("2026-11-06T14:00:00Z", true)]
    [InlineData("2026-11-06T17:00:00Z", false)]
    public async Task AnyStretchOfTheWindowAroundTheTimeCanReachTheMaximum(string lastStartAt, bool isRefused)
    {
        FakeSquareService square = new();
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-10-06T16:00:00Z"));
        square.Hold(1, AppointmentStatus.Accepted, Instant(lastStartAt));

        Exception? refusal = await Record.ExceptionAsync(() => Service(square).BookAsync(Request(openTime), Cancellation));

        Assert.Equal(isRefused, refusal is BookingLimitReachedException);
    }

    [Fact]
    public async Task BookingsOfEveryCustomerWithThePhoneCountTowardTheMaximum()
    {
        FakeSquareService square = new()
        {
            DuplicateCustomerIds = ["CUSTOMER0TEST0DUPLICATE01"],
        };
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-11-02T14:00:00Z"));
        square.Hold(MaxUpcomingPerPhone - 1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"), "CUSTOMER0TEST0DUPLICATE01");

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

    [Fact]
    public async Task StartTextsTheCodeWithoutAskingSquareAnything()
    {
        FakeSquareService square = new();
        FakeTwilioVerifyService twilio = new();

        await Service(square, twilio).SendLookupCodeAsync(KnownPhone, Cancellation);

        Assert.Equal([KnownPhone], twilio.StartedPhones);
        Assert.Equal(0, square.AppointmentListings);
    }

    [Fact]
    public async Task StartDoesTheSameForAPhoneSquareDoesNotKnow()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
        };
        FakeTwilioVerifyService twilio = new();

        await Service(square, twilio).SendLookupCodeAsync(UnknownPhone, Cancellation);

        Assert.Equal([UnknownPhone], twilio.StartedPhones);
        Assert.Equal(0, square.AppointmentListings);
    }

    [Fact]
    public async Task AThirdCodeForOnePhoneIsRateLimitedBeforeTwilioIsCalled()
    {
        FakeTwilioVerifyService twilio = new();
        BookingService service = Service(new FakeSquareService(), twilio);
        await service.SendLookupCodeAsync(KnownPhone, Cancellation);
        await service.SendLookupCodeAsync(KnownPhone, Cancellation);

        RateLimitedException limited = await Assert.ThrowsAsync<RateLimitedException>(() => service.SendLookupCodeAsync(KnownPhone, Cancellation));

        Assert.True(limited.RetryAfter > TimeSpan.Zero);
        Assert.Equal(MaxTextCodesPerPhone, twilio.StartedPhones.Count);
    }

    [Fact]
    public async Task EachPhoneHasItsOwnTextCodeLimit()
    {
        FakeTwilioVerifyService twilio = new();
        BookingService service = Service(new FakeSquareService(), twilio);
        await service.SendLookupCodeAsync(KnownPhone, Cancellation);
        await service.SendLookupCodeAsync(KnownPhone, Cancellation);

        await service.SendLookupCodeAsync(UnknownPhone, Cancellation);

        Assert.Contains(UnknownPhone, twilio.StartedPhones);
    }

    [Fact]
    public async Task ATwilioFailureOnStartReachesTheCaller()
    {
        FakeTwilioVerifyService twilio = new()
        {
            Failure = new TwilioRequestFailedException(StatusCodes.Status500InternalServerError, null),
        };

        await Assert.ThrowsAsync<TwilioRequestFailedException>(() => Service(new FakeSquareService(), twilio).SendLookupCodeAsync(KnownPhone, Cancellation));
    }

    [Fact]
    public async Task ARightCodeListsUpcomingBookingsSoonestFirstWithValidManageTokens()
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-11-09T14:00:00Z"));
        square.Hold(2, AppointmentStatus.Pending, Instant("2026-10-20T14:00:00Z"));
        BookingService service = Service(square, await StartedTwilioAsync());

        List<FoundBooking> found = await service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation);

        Assert.Equal(
            [
                Instant("2026-10-20T14:00:00Z"),
                Instant("2026-10-21T14:00:00Z"),
                Instant("2026-11-09T14:00:00Z"),
            ],
            found.Select(booking => booking.StartAt));
        Assert.All(found, booking => Assert.True(ManageTokens.Signer.IsValid(booking.Id, booking.ManageToken)));
    }

    [Fact]
    public async Task CancelledDeclinedNoShowAndPastBookingsAreLeftOut()
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.CancelledByCustomer, Instant("2026-10-20T14:00:00Z"));
        square.Hold(1, AppointmentStatus.CancelledBySeller, Instant("2026-10-21T14:00:00Z"));
        square.Hold(1, AppointmentStatus.Declined, Instant("2026-10-22T14:00:00Z"));
        square.Hold(1, AppointmentStatus.NoShow, Instant("2026-10-23T14:00:00Z"));
        square.Hold(1, AppointmentStatus.Accepted, now.AddMinutes(-1));
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-24T14:00:00Z"));
        BookingService service = Service(square, await StartedTwilioAsync());

        List<FoundBooking> found = await service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation);

        Assert.Equal([Instant("2026-10-24T14:00:00Z")], found.Select(booking => booking.StartAt));
    }

    [Fact]
    public async Task BookingsBeyondTheBookingWindowAreNotRead()
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.Accepted, now + square.BookingProfile.MaximumAdvance + TimeSpan.FromDays(1));
        BookingService service = Service(square, await StartedTwilioAsync());

        List<FoundBooking> found = await service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation);

        Assert.Empty(found);
    }

    [Fact]
    public async Task EveryCustomerWithThePhoneContributesItsBookings()
    {
        FakeSquareService square = new()
        {
            DuplicateCustomerIds = ["CUSTOMER0TEST0DUPLICATE01", "CUSTOMER0TEST0DUPLICATE02"],
        };
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"));
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-21T14:00:00Z"), "CUSTOMER0TEST0DUPLICATE01");
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-22T14:00:00Z"), "CUSTOMER0TEST0DUPLICATE02");
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-23T14:00:00Z"), "CUSTOMER0TEST0SOMEONEELSE");
        BookingService service = Service(square, await StartedTwilioAsync());

        List<FoundBooking> found = await service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation);

        Assert.Equal(3, found.Count);
        Assert.DoesNotContain(Instant("2026-10-23T14:00:00Z"), found.Select(booking => booking.StartAt));
    }

    [Fact]
    public async Task APhoneSquareDoesNotKnowHasNoBookings()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
        };
        BookingService service = Service(square, await StartedTwilioAsync());

        List<FoundBooking> found = await service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation);

        Assert.Empty(found);
        Assert.Equal(0, square.AppointmentListings);
    }

    [Theory]
    [InlineData("000000")]
    [InlineData("1234")]
    public async Task AWrongCodeIsInvalidAndSquareIsNeverAsked(string code)
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"));
        BookingService service = Service(square, await StartedTwilioAsync());

        await Assert.ThrowsAsync<CodeInvalidException>(() => service.GetVerifiedListAsync(ListRequest(KnownPhone, code), Cancellation));
        Assert.Equal(0, square.AppointmentListings);
    }

    [Fact]
    public async Task AFourthVerifyAttemptForOnePhoneIsRateLimitedBeforeTwilioIsAsked()
    {
        FakeSquareService square = new();
        BookingService service = Service(square, await StartedTwilioAsync());
        for (int attempt = 0; attempt < MaxVerifyAttemptsPerPhone; attempt++)
        {
            await Assert.ThrowsAsync<CodeInvalidException>(() => service.GetVerifiedListAsync(ListRequest(KnownPhone, "000000"), Cancellation));
        }

        await Assert.ThrowsAsync<RateLimitedException>(() => service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation));
    }

    [Fact]
    public async Task ACodeForAPhoneThatWasNeverTextedIsInvalid()
    {
        BookingService service = Service(new FakeSquareService(), new FakeTwilioVerifyService());

        await Assert.ThrowsAsync<CodeInvalidException>(() => service.GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation));
    }

    [Fact]
    public async Task ATwilioFailureOnVerifyReachesTheCaller()
    {
        FakeTwilioVerifyService twilio = new()
        {
            Failure = new TwilioNotConfiguredException(),
        };

        await Assert.ThrowsAsync<TwilioNotConfiguredException>(() => Service(new FakeSquareService(), twilio).GetVerifiedListAsync(ListRequest(KnownPhone), Cancellation));
    }

    private static async Task<FakeTwilioVerifyService> StartedTwilioAsync()
    {
        FakeTwilioVerifyService twilio = new();
        await twilio.StartAsync(KnownPhone, Cancellation);
        return twilio;
    }

    private static VerifiedListRequest ListRequest(string phone, string code = FakeTwilioVerifyService.ApprovedCode) => new(
        phone,
        code
    );

    private static FakeSquareService Square(bool isCustomerKnown)
    {
        FakeSquareService square = new();
        if (!isCustomerKnown)
        {
            square.CustomerId = null;
        }

        return square;
    }

    private static BookingService Service(FakeSquareService square, FakeTwilioVerifyService? twilio = null)
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
            twilio ?? new FakeTwilioVerifyService(),
            new PhoneRateLimiter(Options.Create(new RateLimitSettings
            {
                LookupPhone = new FixedWindowLimit
                {
                    PermitLimit = MaxTextCodesPerPhone,
                    Window = TimeSpan.FromMinutes(10),
                },
                LookupVerifyPhone = new FixedWindowLimit
                {
                    PermitLimit = MaxVerifyAttemptsPerPhone,
                    Window = TimeSpan.FromMinutes(10),
                },
            })),
            Options.Create(new BookingSettings
            {
                MaxUpcomingPerPhone = MaxUpcomingPerPhone,
                CapWindow = TimeSpan.FromDays(31),
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
