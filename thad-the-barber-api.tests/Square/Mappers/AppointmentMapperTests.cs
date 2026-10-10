using System.Globalization;
using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
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
                "r1h5tfnj3ybo31",
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
            _ => booking with { StartAt = null },
        };

        Assert.Throws<InvalidOperationException>(incomplete.ToAppointment);
    }

    private static SquareBooking ReadBooking() => SquareFixture.ReadAs<CreateBookingResponse>("create-booking.json").Booking!;
}
