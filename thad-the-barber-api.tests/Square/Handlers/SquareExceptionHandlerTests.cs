using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Handlers;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Handlers;

public sealed class SquareExceptionHandlerTests
{
    public static TheoryData<Exception, int> SquareFailures => new()
    {
        { new SquareNotConnectedException("Square refused the refresh token."), StatusCodes.Status503ServiceUnavailable },
        { new BookableServiceNotResolvedException("Square has 2 services bookable online."), StatusCodes.Status503ServiceUnavailable },
        { new SquareApiException("Square is down", StatusCodes.Status500InternalServerError, """{"errors":[]}"""), StatusCodes.Status503ServiceUnavailable },
        { new HttpRequestException("No route to Square."), StatusCodes.Status503ServiceUnavailable },
        { new TaskCanceledException("Square timed out."), StatusCodes.Status503ServiceUnavailable },
        { new Azure.RequestFailedException(403, "Key Vault firewall."), StatusCodes.Status503ServiceUnavailable },
        { new SquareApiException("Bad request", StatusCodes.Status400BadRequest, """{"errors":[]}"""), StatusCodes.Status502BadGateway },
    };

    [Theory]
    [MemberData(nameof(SquareFailures))]
    public async Task SquareFailuresBecomeProblemDetails(Exception exception, int expectedStatus)
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(expectedStatus, context.Response.StatusCode);
        JsonElement body = await ExceptionHandlerHarness.ReadBodyAsync(context);
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.DoesNotContain(exception.Message, body.GetRawText());
    }

    [Fact]
    public async Task ProblemExceptionsAreLeftToTheirOwnHandler()
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, new SlotUnavailableException("Taken."), TestContext.Current.CancellationToken);

        Assert.False(handled);
    }

    [Fact]
    public async Task OtherExceptionsAreLeftToTheDefaultHandler()
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, new InvalidOperationException(), TestContext.Current.CancellationToken);

        Assert.False(handled);
    }

    private static SquareExceptionHandler Handler(HttpContext context) =>
        new(context.RequestServices.GetRequiredService<IProblemDetailsService>());
}
