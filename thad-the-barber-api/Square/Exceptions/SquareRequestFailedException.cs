using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>
/// Square answered with an error. <see cref="Services.SquareService"/> throws it in place of the SDK's exception, whose
/// message carries the whole response body, so only the status and Square's error codes and fields ever leave
/// <c>Square/</c> or reach the logs.
/// </summary>
public sealed class SquareRequestFailedException(int statusCode, List<SquareError> errors)
    : Exception($"Square answered {statusCode}: {string.Join(", ", errors.Select(error => $"{error.Category} {error.Code} {error.Field}".TrimEnd()))}.")
{
    public int StatusCode { get; } = statusCode;

    public List<SquareError> Errors { get; } = errors;
}
