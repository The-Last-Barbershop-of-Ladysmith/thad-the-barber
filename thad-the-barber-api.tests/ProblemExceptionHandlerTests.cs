using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Square;
using ThadTheBarber.Api.Infrastructure.Problems.Handlers;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Tests;

public sealed class ProblemExceptionHandlerTests
{
    public static TheoryData<Exception, int, string> Problems => new()
    {
        { new SlotUnavailableException("Taken."), StatusCodes.Status409Conflict, "slot_unavailable" },
        { new InvalidCustomerDetailsException("Bad phone."), StatusCodes.Status400BadRequest, "invalid_customer_details" },
    };

    [Theory]
    [MemberData(nameof(Problems))]
    public async Task ProblemsBecomeProblemDetailsWithTheirCode(Exception exception, int expectedStatus, string expectedCode)
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(expectedStatus, context.Response.StatusCode);
        JsonElement body = await ExceptionHandlerHarness.ReadBodyAsync(context);
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.Equal(expectedCode, body.GetProperty("code").GetString());
        Assert.DoesNotContain(exception.Message, body.GetRawText());
    }

    [Fact]
    public async Task OtherExceptionsAreLeftToTheNextHandler()
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(
            context,
            new SquareApiException("Bad request", StatusCodes.Status400BadRequest, """{"errors":[]}"""),
            TestContext.Current.CancellationToken);

        Assert.False(handled);
    }

    private static ProblemExceptionHandler Handler(HttpContext context) =>
        new(context.RequestServices.GetRequiredService<IProblemDetailsService>());
}
