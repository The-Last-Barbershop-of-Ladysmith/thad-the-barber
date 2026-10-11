namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// A booking seen through its manage link: only its time, nothing about the customer (BR-20). <see cref="CanChange"/>
/// is false once it's cancelled or its start time has passed, by the server's clock (BR-07).
/// </summary>
public sealed record ManagedBooking(
    string Id,
    DateTimeOffset StartAt,
    bool IsCancelled,
    bool CanChange
);
