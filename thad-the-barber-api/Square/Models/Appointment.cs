namespace ThadTheBarber.Api.Square.Models;

/// <summary>A Square booking. Rescheduling or cancelling it needs <see cref="Version"/>.</summary>
public sealed record Appointment(
    string Id,
    int Version,
    AppointmentStatus Status,
    DateTimeOffset StartAt
)
{
    /// <summary>Still holds its time: pending or accepted, not cancelled, declined or a no-show.</summary>
    public bool IsActive => Status is AppointmentStatus.Pending or AppointmentStatus.Accepted;

    /// <summary>Still holds a time that hasn't started yet, so it can change and counts toward BR-13's cap.</summary>
    public bool IsUpcomingAt(DateTimeOffset now) => IsActive && now < StartAt;

    public bool IsCancelled => Status is AppointmentStatus.CancelledByCustomer or AppointmentStatus.CancelledBySeller or AppointmentStatus.Declined;
}
