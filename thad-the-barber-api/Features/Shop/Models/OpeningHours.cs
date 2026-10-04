namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>One open day, like the UI's <c>OpeningHours</c>: <see cref="Day"/> 0 = Sunday, times in minutes after midnight.</summary>
public sealed record OpeningHours(
    int Day,
    int OpensAt,
    int ClosesAt
);
