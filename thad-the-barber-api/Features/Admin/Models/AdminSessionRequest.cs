namespace ThadTheBarber.Api.Features.Admin.Models;

/// <param name="IdToken">The Google ID token ("credential") that Google Identity Services gives the browser.</param>
public sealed record AdminSessionRequest(
    string? IdToken
);
