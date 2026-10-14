using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Booking.Configuration;

public sealed class BookingSettings
{
    public const string SectionName = "Booking";

    /// <summary>
    /// Appointments one phone number can hold within <see cref="CapWindow"/> before it's asked to call or text
    /// instead (BR-13).
    /// </summary>
    [Range(1, int.MaxValue)]
    public int MaxUpcomingPerPhone { get; set; }

    /// <summary>
    /// The stretch the cap applies to, wherever it falls. Checking reads one window either side of the requested time:
    /// two Square calls per customer at 31 days, Square's longest list.
    /// </summary>
    [Range(typeof(TimeSpan), "1.00:00:00", "366.00:00:00")]
    public TimeSpan CapWindow { get; set; }
}
