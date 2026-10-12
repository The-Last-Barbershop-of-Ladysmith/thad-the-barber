using System.Diagnostics;
using OpenTelemetry;
using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

/// <summary>
/// Redacts every span's name and tags, URLs included, before it's exported (BR-23): name, phone and email tags lose
/// their value, and other string tags are masked. Only changed tags are written back.
/// </summary>
public sealed class RedactingSpanProcessor : BaseProcessor<Activity>
{
    public override void OnEnd(Activity data)
    {
        data.DisplayName = data.DisplayName.Redact();
        List<KeyValuePair<string, object?>>? changedTags = null;
        foreach ((string key, object? value) in data.TagObjects)
        {
            object? redactedValue = key.RedactValue(value);
            if (!Equals(redactedValue, value))
            {
                changedTags ??= [];
                changedTags.Add(new KeyValuePair<string, object?>(key, redactedValue));
            }
        }

        foreach ((string key, object? value) in changedTags ?? [])
        {
            data.SetTag(key, value);
        }
    }
}
