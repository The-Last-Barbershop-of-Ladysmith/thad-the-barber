namespace ThadTheBarber.Api.Features.Admin.Models;

/// <summary>What the sign-in page needs to draw Google's button: the OAuth client ID, which is public by design.</summary>
public sealed record AdminConfig(
    string GoogleClientId
);
