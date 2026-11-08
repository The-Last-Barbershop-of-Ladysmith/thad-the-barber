namespace ThadTheBarber.Api.Features.Reviews.Models;

/// <summary>The Google listing's rating and review count, with a link to the listing when the file has an https one.</summary>
public sealed record ReviewRating(
    double Score,
    int Count,
    string? Url
);
