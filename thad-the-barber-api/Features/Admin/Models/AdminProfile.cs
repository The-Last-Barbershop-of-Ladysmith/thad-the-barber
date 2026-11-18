namespace ThadTheBarber.Api.Features.Admin.Models;

/// <summary>Who the admin token belongs to, from <c>GET /api/admin/me</c>.</summary>
public sealed record AdminProfile(
    string Email,
    string? Name
);
