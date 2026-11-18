namespace ThadTheBarber.Api.Features.Admin.Models;

/// <summary>A Google account whose ID token passed every check. <c>Name</c> is what Google shows for it, when it says.</summary>
public sealed record GoogleIdentity(
    string Subject,
    string Email,
    string? Name
);
