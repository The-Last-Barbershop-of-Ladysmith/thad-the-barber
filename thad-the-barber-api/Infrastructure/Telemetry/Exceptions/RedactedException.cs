using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Exceptions;

/// <summary>
/// Exported in place of a logged exception whose text holds customer data. App Insights reads the message, the inner
/// exceptions and the stack trace; the messages are redacted, the original type name leads each one and the stack
/// trace is kept, so the failure can still be traced to its code.
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
}
