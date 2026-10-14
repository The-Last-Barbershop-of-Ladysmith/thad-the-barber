namespace ThadTheBarber.Api.Features.Booking.Configuration;

public sealed class BookingSettings
{
    public const string SectionName = "Booking";

    /// <summary>Upcoming appointments one phone number can hold before it's asked to call or text instead (BR-13).</summary>
    public int MaxUpcomingPerPhone { get; set; }
}
