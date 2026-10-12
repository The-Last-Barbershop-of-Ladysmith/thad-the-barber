using OpenTelemetry;
using OpenTelemetry.Logs;
using ThadTheBarber.Api.Infrastructure.Telemetry.Exceptions;
using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

/// <summary>
/// Redacts every log record's text, attributes and exception before it's exported (BR-23). A record with a name, phone
/// or email attribute also loses its formatted message, so App Insights shows the template (<c>Booked {Name}</c>)
/// instead of the filled-in text.
/// </summary>
public sealed class RedactingLogProcessor : BaseProcessor<LogRecord>
{
    public override void OnEnd(LogRecord data)
    {
        data.FormattedMessage = data.FormattedMessage?.Redact();
        data.Body = data.Body?.Redact();
        if (data.Attributes is { Count: > 0 } attributes)
        {
            if (attributes.Any(attribute => attribute.Key.IsPersonalDataKey()))
            {
                data.FormattedMessage = null;
            }

            data.Attributes = [.. attributes.Select(RedactValue)];
        }

        if (data.Exception is not null && RedactedException.IsNeeded(data.Exception))
        {
            data.Exception = new RedactedException(data.Exception);
        }
    }

    private static KeyValuePair<string, object?> RedactValue(KeyValuePair<string, object?> attribute)
    {
        if (attribute.Key.IsPersonalDataKey())
        {
            return new KeyValuePair<string, object?>(attribute.Key, StringRedactionExtensions.ValuePlaceholder);
        }

        if (attribute.Value is string text)
        {
            return new KeyValuePair<string, object?>(attribute.Key, text.Redact());
        }

        return attribute;
    }
}
