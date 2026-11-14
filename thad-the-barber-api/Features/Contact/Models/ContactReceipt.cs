namespace ThadTheBarber.Api.Features.Contact.Models;

/// <summary>The reply to a saved message: its id, which is also part of the saved file's name.</summary>
public sealed record ContactReceipt(
    Guid Id
);
