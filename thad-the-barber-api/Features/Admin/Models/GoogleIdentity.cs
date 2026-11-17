namespace ThadTheBarber.Api.Features.Admin.Models;

/// <summary>A Google account whose ID token passed every check.</summary>
public sealed record GoogleIdentity(
    string Subject,
    string Email
);
