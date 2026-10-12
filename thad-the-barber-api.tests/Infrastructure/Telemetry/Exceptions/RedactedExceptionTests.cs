using Square;
using ThadTheBarber.Api.Infrastructure.Telemetry.Exceptions;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Tests.Infrastructure.Telemetry.Exceptions;

public sealed class RedactedExceptionTests
{
    private const string Body = """{"errors":[{"detail":"+15550100163 for Quillon Vey-Ashgrove is invalid"}]}""";

    [Fact]
    public void CleanExceptionsAreNotRedacted()
    {
        Assert.False(RedactedException.IsNeeded(new InvalidOperationException("Square returned no booking.", new TimeoutException("Timed out."))));
    }

    [Fact]
    public void AnInnerExceptionWithCustomerDataNeedsRedacting()
    {
        Assert.True(RedactedException.IsNeeded(new InvalidCustomerDetailsException("Square rejected the customer's name or phone.", SquareRejection())));
    }

    [Fact]
    public void MessageInnerExceptionAndTextAreRedacted()
    {
        Exception original = Thrown(new InvalidCustomerDetailsException("Square rejected the customer's name or phone.", SquareRejection()));

        RedactedException redacted = new(original);

        string text = redacted.ToString();
        Assert.DoesNotContain("5550100163", text, StringComparison.Ordinal);
        Assert.DoesNotContain("Quillon", text, StringComparison.Ordinal);
        Assert.StartsWith("ThadTheBarber.Api.Square.Exceptions.InvalidCustomerDetailsException: ", redacted.Message, StringComparison.Ordinal);
        Assert.StartsWith("Square.SquareApiException: Error with status code 400", redacted.InnerException!.Message, StringComparison.Ordinal);
        Assert.Contains("Body: [removed]", redacted.InnerException.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void StackTraceIsKept()
    {
        Exception original = Thrown(new InvalidOperationException("Call +15550100163."));

        RedactedException redacted = new(original);

        Assert.Equal(original.StackTrace, redacted.StackTrace);
        Assert.Contains(nameof(Thrown), redacted.ToString(), StringComparison.Ordinal);
    }

    private static SquareApiException SquareRejection() => new("Error with status code 400", 400, Body);

    private static Exception Thrown(Exception exception)
    {
        try
        {
            throw exception;
        }
        catch (Exception caught)
        {
            return caught;
        }
    }
}
