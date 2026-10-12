using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Mappers;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Mappers;

public sealed class SquareErrorMapperTests
{
    [Fact]
    public void RecordedSlotErrorKeepsStatusCategoryCodeAndFieldButNotDetail()
    {
        SquareApiException squareException = new("Error with status code 400", 400, SquareFixture.ReadText("error-slot-no-longer-available.json"));

        SquareRequestFailedException failure = squareException.ToRequestFailedException();

        Assert.Equal(400, failure.StatusCode);
        Assert.Equal(new SquareError("INVALID_REQUEST_ERROR", "BAD_REQUEST", "start_at"), Assert.Single(failure.Errors));
        Assert.Equal("Square answered 400: INVALID_REQUEST_ERROR BAD_REQUEST start_at.", failure.Message);
        Assert.DoesNotContain("no longer available", failure.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void ErrorsWithoutAFieldAreListedByCode()
    {
        SquareApiException squareException = new(
            "Error with status code 503",
            503,
            """{"errors":[{"category":"API_ERROR","code":"SERVICE_UNAVAILABLE"},{"category":"API_ERROR","code":"INTERNAL_SERVER_ERROR"}]}"""
        );

        SquareRequestFailedException failure = squareException.ToRequestFailedException();

        Assert.Equal("Square answered 503: API_ERROR SERVICE_UNAVAILABLE, API_ERROR INTERNAL_SERVER_ERROR.", failure.Message);
        Assert.All(failure.Errors, error => Assert.Null(error.Field));
    }
}
