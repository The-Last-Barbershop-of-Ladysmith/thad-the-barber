using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Handlers;

namespace ThadTheBarber.Api.Tests.Square;

public sealed class SquareExceptionHandlerTests
{
    public static TheoryData<Exception, int> SquareFailures => new()
    {
        { new SquareNotConnectedException("Square refused the refresh token."), StatusCodes.Status503ServiceUnavailable },
        { new SquareApiException("Square is down", StatusCodes.Status500InternalServerError, """{"errors":[]}"""), StatusCodes.Status503ServiceUnavailable },
        { new HttpRequestException("No route to Square."), StatusCodes.Status503ServiceUnavailable },
        { new TaskCanceledException("Square timed out."), StatusCodes.Status503ServiceUnavailable },
        { new Azure.RequestFailedException(403, "Key Vault firewall."), StatusCodes.Status503ServiceUnavailable },
        { new SquareApiException("Bad request", StatusCodes.Status400BadRequest, """{"errors":[]}"""), StatusCodes.Status502BadGateway },
    };

    public static TheoryData<Exception, int, string> CustomerFacingFailures => new()
    {
        { new SlotUnavailableException("Taken."), StatusCodes.Status409Conflict, "slot_unavailable" },
        { new InvalidCustomerDetailsException("Bad phone."), StatusCodes.Status400BadRequest, "invalid_customer_details" },
    };

    [Theory]
    [MemberData(nameof(SquareFailures))]
    public async Task SquareFailuresBecomeProblemDetails(Exception exception, int expectedStatus)
    {
        DefaultHttpContext context = NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(expectedStatus, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        JsonElement body = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body, cancellationToken: TestContext.Current.CancellationToken);
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.DoesNotContain(exception.Message, body.GetRawText());
        Assert.False(body.TryGetProperty("code", out _));
    }

    [Theory]
    [MemberData(nameof(CustomerFacingFailures))]
    public async Task CustomerFacingFailuresCarryACode(Exception exception, int expectedStatus, string expectedCode)
    {
        DefaultHttpContext context = NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(expectedStatus, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        JsonElement body = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body, cancellationToken: TestContext.Current.CancellationToken);
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.Equal(expectedCode, body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task OtherExceptionsAreLeftToTheDefaultHandler()
    {
        DefaultHttpContext context = NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, new InvalidOperationException(), TestContext.Current.CancellationToken);

        Assert.False(handled);
    }

    private static DefaultHttpContext NewContext()
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddProblemDetails();
        return new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider(),
            Response = { Body = new MemoryStream() },
        };
    }

    private static SquareExceptionHandler Handler(HttpContext context) =>
        new(context.RequestServices.GetRequiredService<IProblemDetailsService>());
}
