using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Twilio.Exceptions;
using ThadTheBarber.Api.Twilio.Handlers;

namespace ThadTheBarber.Api.Tests.Twilio.Handlers;

public sealed class TwilioExceptionHandlerTests
{
    public static TheoryData<Exception> TwilioFailures => new()
    {
        new TwilioNotConfiguredException(),
        new TwilioRequestFailedException(StatusCodes.Status429TooManyRequests, 60203),
        new TwilioRequestFailedException(StatusCodes.Status500InternalServerError, null),
        new TwilioRequestFailedException(0, null),
    };

    [Theory]
    [MemberData(nameof(TwilioFailures))]
    public async Task TwilioFailuresBecomeUnavailableWithoutDetails(Exception exception)
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, exception, TestContext.Current.CancellationToken);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, context.Response.StatusCode);
        JsonElement body = await ExceptionHandlerHarness.ReadBodyAsync(context);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, body.GetProperty("status").GetInt32());
        Assert.Equal("verification_unavailable", body.GetProperty("code").GetString());
        Assert.DoesNotContain(exception.Message, body.GetRawText());
    }

    [Fact]
    public async Task OtherExceptionsAreLeftToTheNextHandler()
    {
        DefaultHttpContext context = ExceptionHandlerHarness.NewContext();

        bool handled = await Handler(context).TryHandleAsync(context, new InvalidOperationException(), TestContext.Current.CancellationToken);

        Assert.False(handled);
    }

    private static TwilioExceptionHandler Handler(HttpContext context) =>
        new(context.RequestServices.GetRequiredService<IProblemDetailsService>());
}
