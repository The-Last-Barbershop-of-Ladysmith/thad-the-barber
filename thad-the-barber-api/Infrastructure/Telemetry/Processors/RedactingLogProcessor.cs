using OpenTelemetry;
using OpenTelemetry.Logs;
using ThadTheBarber.Api.Infrastructure.Telemetry.Exceptions;
using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

/// <summary>
/// Redacts every log record's text, attributes and exception before it's exported (BR-23). A record with a name, phone
/// or email attribute also loses its formatted message, so App Insights shows the template (<c>Booked {Name}</c>)
/// instead of the filled-in text. The attribute list is copied only when a value changes.
/// </summary>
public sealed class RedactingLogProcessor : BaseProcessor<LogRecord>
{
    public override void OnEnd(LogRecord data)
    {
        bool hasPersonalData = false;
        if (data.Attributes is { Count: > 0 } attributes)
        {
            List<KeyValuePair<string, object?>>? redacted = null;
            for (int i = 0; i < attributes.Count; i++)
            {
                (string key, object? value) = attributes[i];
                object? redactedValue = key.RedactValue(value);
                hasPersonalData |= key.IsPersonalDataKey();
                if (!Equals(redactedValue, value))
                {
                    redacted ??= [.. attributes];
                    redacted[i] = new KeyValuePair<string, object?>(key, redactedValue);
                }
            }

            if (redacted is not null)
            {
                data.Attributes = redacted;
            }
        }

        if (hasPersonalData)
        {
            data.FormattedMessage = null;
        }
        else
        {
            data.FormattedMessage = data.FormattedMessage?.Redact();
        }

        data.Body = data.Body?.Redact();
        if (data.Exception is not null && RedactedException.IsNeeded(data.Exception))
        {
            data.Exception = new RedactedException(data.Exception);
        }
    }
}
