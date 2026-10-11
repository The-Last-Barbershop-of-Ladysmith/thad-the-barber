namespace ThadTheBarber.Api.Features.Booking.Models;

/// <summary>
/// The booked appointment: no customer details, since the client already has them (BR-07). <see cref="StartAt"/> is
/// UTC; the UI shows it in the shop's timezone. <see cref="ManageToken"/> goes in the manage link's URL fragment
/// (<c>/book/manage/{id}#t=…</c>) and back to the API in the <c>X-Manage-Token</c> header (BR-08).
/// </summary>
public sealed record BookingConfirmation(
    string Id,
    DateTimeOffset StartAt,
    string ManageToken
);
