using Square;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class AvailabilityMapperTests
{
    [Fact]
    public void AvailabilityBecomesTimeSlot()
    {
        Assert.Equal(
            new TimeSlot(
                new DateTimeOffset(2026, 10, 5, 13, 0, 0, TimeSpan.Zero),
                "LVF9Q8XN61NA4",
                "TMN76Ik4Cpv-ToYe",
                "TC6VHEWA3WPRAXH6HDMQ5DJN",
                1791077615792
            ),
            ReadAvailability().ToTimeSlot());
    }

    [Fact]
    public void TimesWithAnOffsetBecomeUtc()
    {
        Availability availability = ReadAvailability() with { StartAt = "2026-10-05T09:00:00-04:00" };

        Assert.Equal(TimeSpan.Zero, availability.ToTimeSlot().StartAt.Offset);
    }

    [Theory]
    [InlineData("AppointmentSegments")]
    [InlineData("StartAt")]
    [InlineData("LocationId")]
    [InlineData("ServiceVariationId")]
    [InlineData("ServiceVariationVersion")]
    public void AnAvailabilityWithoutARequiredFieldThrows(string field)
    {
        Availability availability = ReadAvailability();
        AppointmentSegment segment = availability.AppointmentSegments!.First();
        Availability incomplete = field switch
        {
            "AppointmentSegments" => availability with { AppointmentSegments = [] },
            "StartAt" => availability with { StartAt = null },
            "LocationId" => availability with { LocationId = null },
            "ServiceVariationId" => availability with { AppointmentSegments = [segment with { ServiceVariationId = null }] },
            _ => availability with { AppointmentSegments = [segment with { ServiceVariationVersion = null }] },
        };

        Assert.Throws<InvalidOperationException>(incomplete.ToTimeSlot);
    }

    private static Availability ReadAvailability() =>
        SquareFixture.ReadAs<SearchAvailabilityResponse>("search-availability.json").Availabilities!.First();
}
