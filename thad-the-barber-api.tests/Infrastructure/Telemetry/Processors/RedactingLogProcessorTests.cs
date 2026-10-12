using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Logs;
using ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

namespace ThadTheBarber.Api.Tests.Infrastructure.Telemetry.Processors;

public sealed partial class RedactingLogProcessorTests
{
    [Fact]
    public void NamePhoneAndEmailAttributesLoseTheirValueAndTheFilledInMessage()
    {
        ExportedLog log = Log(logger => LogBooked(logger, "Quillon Vey-Ashgrove", "+15550100163", "q.vey@example.com", "2026-10-07T13:30:00Z"));

        Assert.Null(log.FormattedMessage);
        Assert.Equal("Booked {Name} on {Phone} ({Email}) for {Slot}", log.Body);
        Assert.Equal("[redacted]", log.Attributes["Name"]);
        Assert.Equal("[redacted]", log.Attributes["Phone"]);
        Assert.Equal("[redacted]", log.Attributes["Email"]);
        Assert.Equal("2026-10-07T13:30:00Z", log.Attributes["Slot"]);
    }

    [Fact]
    public void PhoneInAnyAttributeOrMessageIsMasked()
    {
        ExportedLog log = Log(logger => LogSquareSaid(logger, "+15550100163 is invalid"));

        Assert.Equal("Square said [phone] is invalid", log.FormattedMessage);
        Assert.Equal("[phone] is invalid", log.Attributes["Detail"]);
    }

    [Fact]
    public void CleanRecordsKeepTheirMessage()
    {
        ExportedLog log = Log(logger => LogReturned(logger, 503, "square_unavailable"));

        Assert.Equal("Returned 503 square_unavailable.", log.FormattedMessage);
    }

    private static ExportedLog Log(Action<ILogger> write)
    {
        LogCapture capture = new();
        using (ILoggerFactory factory = LoggerFactory.Create(logging => logging.AddOpenTelemetry(options =>
        {
            options.IncludeFormattedMessage = true;
            options.AddProcessor(new RedactingLogProcessor());
            options.AddProcessor(capture);
        })))
        {
            write(factory.CreateLogger("Test"));
        }

        return Assert.Single(capture.Logs);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Booked {Name} on {Phone} ({Email}) for {Slot}")]
    private static partial void LogBooked(ILogger logger, string name, string phone, string email, string slot);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Square said {Detail}")]
    private static partial void LogSquareSaid(ILogger logger, string detail);

    [LoggerMessage(Level = LogLevel.Information, Message = "Returned {StatusCode} {Code}.")]
    private static partial void LogReturned(ILogger logger, int statusCode, string code);

    private sealed record ExportedLog(
        string? FormattedMessage,
        string? Body,
        Dictionary<string, object?> Attributes
    );

    private sealed class LogCapture : BaseProcessor<LogRecord>
    {
        public List<ExportedLog> Logs { get; } = [];

        public override void OnEnd(LogRecord data) =>
            Logs.Add(new ExportedLog(
                data.FormattedMessage,
                data.Body,
                (data.Attributes ?? []).ToDictionary(attribute => attribute.Key, attribute => attribute.Value)
            ));
    }
}
