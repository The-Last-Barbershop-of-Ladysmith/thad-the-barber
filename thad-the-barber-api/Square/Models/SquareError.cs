namespace ThadTheBarber.Api.Square.Models;

/// <summary>
/// One error from a Square response: its category, code and the field it's about. Square's free-text <c>detail</c> is
/// left out because it can repeat the customer's name or phone (BR-23); the full response stays in Square's API Logs.
/// </summary>
public sealed record SquareError(
    string Category,
    string Code,
    string? Field
);
