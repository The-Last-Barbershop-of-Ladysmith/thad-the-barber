namespace ThadTheBarber.Api.Features.Reviews.Models;

public sealed record Review(
    string Id,
    string Quote,
    string Author,
    string Source,
    int Rating
);
