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

    /// <summary>Messages, attribute values, exception text and span tags, as exported.</summary>
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

    private sealed class LogCapture(TelemetryCapture capture) : BaseProcessor<LogRecord>
    {
        public override void OnEnd(LogRecord data)
        {
            capture._texts.Enqueue(data.FormattedMessage ?? string.Empty);
            capture._texts.Enqueue(data.Body ?? string.Empty);
            foreach (KeyValuePair<string, object?> attribute in data.Attributes ?? [])
            {
                capture._texts.Enqueue(attribute.Value?.ToString() ?? string.Empty);
            }

            for (Exception? exception = data.Exception; exception is not null; exception = exception.InnerException)
            {
                capture._texts.Enqueue(exception.Message);
                capture._texts.Enqueue(exception.ToString());
            }
        }
    }

    private sealed class SpanCapture(TelemetryCapture capture) : BaseProcessor<Activity>
    {
        public override void OnEnd(Activity data)
        {
            capture._spans.Enqueue(data);
            capture._texts.Enqueue(data.DisplayName);
            foreach (KeyValuePair<string, object?> tag in data.TagObjects)
            {
                capture._texts.Enqueue(tag.Value?.ToString() ?? string.Empty);
            }
        }
    }
}
