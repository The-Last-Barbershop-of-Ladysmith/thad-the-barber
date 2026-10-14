using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Channels;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// Collects the text of every log record and request span a host would export. Its processors are added after the
/// app's, where Azure Monitor's exporters sit, so they see what App Insights would receive. ASP.NET Core ends a
/// request's span after the client already has the response, so wait for it with <see cref="WaitForSpanAsync"/>.
/// </summary>
public sealed class TelemetryCapture
{
    private static readonly TimeSpan spanWait = TimeSpan.FromSeconds(10);

    private readonly ConcurrentQueue<string> _texts = new();
    private readonly Channel<Activity> _endedSpans = Channel.CreateUnbounded<Activity>();

    /// <summary>Messages, attribute values, exception text, span names, tags and events, as exported.</summary>
    public IReadOnlyCollection<string> Texts => _texts;

    /// <summary>The first ended span matching <paramref name="match"/>, waiting up to 10 seconds for it.</summary>
    public async Task<Activity> WaitForSpanAsync(Func<Activity, bool> match, CancellationToken cancellationToken)
    {
        using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(spanWait);
        await foreach (Activity span in _endedSpans.Reader.ReadAllAsync(timeout.Token))
        {
            if (match(span))
            {
                return span;
            }
        }

        throw new UnreachableException("The span channel is never completed.");
    }

    public WebApplicationFactory<Program> Attach(WebApplicationFactory<Program> host) =>
        host.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddProcessor(new LogCapture(this)));
            services.ConfigureOpenTelemetryTracerProvider(tracing => tracing
                .AddSource("Microsoft.AspNetCore")
                .AddProcessor(new SpanCapture(this)));
        }));

    private void Add(object? value)
    {
        if (value?.ToString() is { Length: > 0 } text)
        {
            _texts.Enqueue(text);
        }
    }

    private sealed class LogCapture(TelemetryCapture capture) : BaseProcessor<LogRecord>
    {
        public override void OnEnd(LogRecord data)
        {
            capture.Add(data.FormattedMessage);
            capture.Add(data.Body);
            foreach (KeyValuePair<string, object?> attribute in data.Attributes ?? [])
            {
                capture.Add(attribute.Value);
            }

            capture.Add(data.Exception);
        }
    }

    private sealed class SpanCapture(TelemetryCapture capture) : BaseProcessor<Activity>
    {
        public override void OnEnd(Activity data)
        {
            capture.Add(data.DisplayName);
            foreach (KeyValuePair<string, object?> tag in data.TagObjects)
            {
                capture.Add(tag.Value);
            }

            foreach (ActivityEvent spanEvent in data.Events)
            {
                capture.Add(spanEvent.Name);
                foreach (KeyValuePair<string, object?> tag in spanEvent.Tags)
                {
                    capture.Add(tag.Value);
                }
            }

            // Last, so a test woken by the span finds its text already in Texts.
            capture._endedSpans.Writer.TryWrite(data);
        }
    }
}
