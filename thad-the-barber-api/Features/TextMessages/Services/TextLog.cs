using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// Appends to the month's <c>messages/yyyy-MM.jsonl</c>: the business record of what was sent, which outlives the telemetry's
/// retention. A line that can't be written is logged and dropped, never thrown, because the text it describes has already gone.
/// </summary>
public sealed partial class TextLog(
    IMediaStorage storage,
    IOptions<MediaStorageSettings> settings,
    TimeProvider time,
    ILogger<TextLog> logger)
{
    public async Task RecordAsync(TextKind kind, string reference, string? messageSid, string status, CancellationToken cancellationToken)
    {
        DateTimeOffset now = time.GetUtcNow();
        TextLogLine line = new(
            now,
            kind,
            reference,
            messageSid,
            status
        );
        try
        {
            await storage.AppendLineAsync(
                settings.Value.ContentContainerName,
                TextBlobNames.Log(now),
                JsonSerializer.Serialize(line, TextJson.LineOptions),
                cancellationToken
            );
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotWritten(logger, exception, kind, status);
        }
    }

    [LoggerMessage(EventName = "TextLogNotWritten", Level = LogLevel.Warning, Message = "A {Kind} text's log line ({Status}) couldn't be written.")]
    private static partial void LogNotWritten(ILogger logger, Exception exception, TextKind kind, string status);
}
