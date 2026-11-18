namespace ThadTheBarber.Api.Features.Admin.Models;

/// <summary>An admin JWT for <c>Authorization: Bearer</c>, when it stops working, and whose it is (the name only when Google gave one).</summary>
public sealed record AdminSession(
    string Token,
    DateTimeOffset ExpiresAt,
    string Email,
    string? Name
);
