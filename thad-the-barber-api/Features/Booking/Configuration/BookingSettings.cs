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

    /// <summary>
    /// How long the home page's next open times are kept and shared by every visitor, so Square is searched at most
    /// once per this long however many people are on the page (#221).
    /// </summary>
    [Range(typeof(TimeSpan), "00:00:01", "00:10:00")]
    public TimeSpan NextTimesCacheFor { get; set; }

    /// <summary>
    /// How long a phone stays trusted after its text code was checked, counted from that check and never extended, so
    /// the customer can reopen their bookings without paying for another text (BR-20).
    /// </summary>
    [Range(typeof(TimeSpan), "00:01:00", "01:00:00")]
    public TimeSpan LookupSessionLifetime { get; set; }
}
