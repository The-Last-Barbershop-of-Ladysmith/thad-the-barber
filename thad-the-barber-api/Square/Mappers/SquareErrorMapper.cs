using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Mappers;

public static class SquareErrorMapper
{
    public static SquareRequestFailedException ToRequestFailedException(this SquareApiException exception) =>
        new(exception.StatusCode, [.. exception.Errors.Select(error => error.ToSquareError())]);

    private static SquareError ToSquareError(this Error error) =>
        new(
            error.Category.ToString(),
            error.Code.ToString(),
            error.Field
        );
}
