using System.Text;
using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Exceptions;

/// <summary>
/// Exported in place of a logged exception whose text holds customer data. App Insights reads the message, the inner
/// exceptions and <see cref="ToString"/>, so all three are redacted; the original type name leads the message and the
/// stack trace is kept, so the failure can still be traced to its code.
/// </summary>
public sealed class RedactedException : Exception
{
    private readonly string? _stackTrace;

    public RedactedException(Exception original)
        : base(
            $"{original.GetType().FullName}: {original.Message.Redact()}",
            original.InnerException is null ? null : new RedactedException(original.InnerException)
        )
    {
        _stackTrace = original.StackTrace;
    }

    public override string? StackTrace => _stackTrace;

    public static bool IsNeeded(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current.Message.Redact() != current.Message)
            {
                return true;
            }
        }

        return false;
    }

    public override string ToString()
    {
        StringBuilder text = new(Message);
        if (InnerException is not null)
        {
            text.Append(" ---> ").Append(InnerException).AppendLine().Append("   --- End of inner exception stack trace ---");
        }

        if (_stackTrace is not null)
        {
            text.AppendLine().Append(_stackTrace);
        }

        return text.ToString();
    }
}
