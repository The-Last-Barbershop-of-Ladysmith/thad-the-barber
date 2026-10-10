namespace ThadTheBarber.Api.Features.Session.Models;

/// <summary>A session JWT for <c>Authorization: Bearer</c>, and when it stops working.</summary>
public sealed record SessionToken(
    string Token,
    DateTimeOffset ExpiresAt
);
