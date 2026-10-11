using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using SquareBooking = Square.Booking;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class AppointmentMapperTests
{
    [Theory]
    [InlineData("create-booking.json", 0, AppointmentStatus.Accepted, "2026-10-05T13:00:00Z")]
    [InlineData("update-booking.json", 1, AppointmentStatus.Accepted, "2026-10-05T13:30:00Z")]
    [InlineData("cancel-booking.json", 2, AppointmentStatus.CancelledByCustomer, "2026-10-05T13:30:00Z")]
    public void BookingBecomesAppointment(string fixture, int version, AppointmentStatus status, string startAt)
    {
        SquareBooking booking = SquareFixture.ReadAs<CreateBookingResponse>(fixture).Booking!;

        Assert.Equal(
            new Appointment(
                "bk_test-0001ab",
                version,
                status,
                DateTimeOffset.Parse(startAt, CultureInfo.InvariantCulture)
            ),
            booking.ToAppointment());
    }

    [Fact]
    public void TimesWithAnOffsetBecomeUtc()
    {
        SquareBooking booking = ReadBooking() with { StartAt = "2026-10-05T09:00:00-04:00" };

        Assert.Equal(TimeSpan.Zero, booking.ToAppointment().StartAt.Offset);
    }

    [Fact]
    public void ABookingHoldsTheTimeSlotItWasCreatedFor()
    {
        Assert.Equal(
            new TimeSlot(
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                "LOCATION0TEST",
                "TM_test-Barber01",
                "VARIATION0HAIRCUT000TEST",
                1791077615792
            ),
            ReadBooking().ToTimeSlot());
    }

    [Fact]
    public void ABookingWithoutAnAppointmentSegmentHasNoTimeSlot()
    {
        SquareBooking booking = ReadBooking() with { AppointmentSegments = [] };

        Assert.Throws<InvalidOperationException>(booking.ToTimeSlot);
    }

    [Theory]
    [InlineData("Id")]
    [InlineData("Status")]
    [InlineData("Version")]
    [InlineData("StartAt")]
    public void ABookingWithoutARequiredFieldThrows(string field)
    {
        SquareBooking booking = ReadBooking();
        SquareBooking incomplete = field switch
        {
            "Id" => booking with { Id = null },
            "Status" => booking with { Status = null },
            "Version" => booking with { Version = null },
            "StartAt" => booking with { StartAt = null },
            _ => throw new ArgumentOutOfRangeException(nameof(field), field, "No such Square booking field."),
        };

        Assert.Throws<InvalidOperationException>(incomplete.ToAppointment);
    }

    private static SquareBooking ReadBooking() => SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!;
}
