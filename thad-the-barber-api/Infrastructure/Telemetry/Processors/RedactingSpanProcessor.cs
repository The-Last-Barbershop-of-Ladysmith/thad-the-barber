using System.Diagnostics;
using OpenTelemetry;
using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

/// <summary>
/// Redacts every span's name and tags, URLs included, before it's exported (BR-23): name, phone and email tags lose
/// their value, and other string tags are masked.
/// </summary>
public sealed class RedactingSpanProcessor : BaseProcessor<Activity>
{
    public override void OnEnd(Activity data)
    {
        data.DisplayName = data.DisplayName.Redact();
        foreach (KeyValuePair<string, object?> tag in data.TagObjects.ToList())
        {
            if (tag.Key.IsPersonalDataKey())
            {
                data.SetTag(tag.Key, StringRedactionExtensions.ValuePlaceholder);
            }
            else if (tag.Value is string text)
            {
                data.SetTag(tag.Key, text.Redact());
            }
        }
    }
}
