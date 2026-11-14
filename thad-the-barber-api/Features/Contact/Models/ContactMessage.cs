namespace ThadTheBarber.Api.Features.Contact.Models;

/// <summary>What is saved for one submission, one JSON file each in the private content container.</summary>
public sealed record ContactMessage(
    Guid Id,
    DateTimeOffset ReceivedAt,
    ContactCategory Category,
    string Message,
    string? Name,
    string? Email,
    string? Phone,
    string? PageOrBooking
);
