using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// Collects the text of every log record and request span a host would export. Its processors are added after the
/// app's, where Azure Monitor's exporters sit, so they see what App Insights would receive.
/// </summary>
public sealed class TelemetryCapture
{
    private readonly ConcurrentQueue<string> _texts = new();
    private readonly ConcurrentQueue<Activity> _spans = new();

    /// <summary>Messages, attribute values, exception text, span names, tags and events, as exported.</summary>
    public IReadOnlyCollection<string> Texts => _texts;

    public IReadOnlyCollection<Activity> Spans => _spans;

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
            capture._spans.Enqueue(data);
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
        }
    }
}
