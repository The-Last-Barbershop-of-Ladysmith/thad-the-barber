namespace ThadTheBarber.Api.Common.Exceptions;

/// <summary>
/// An outcome the caller can act on, such as a taken time. <see cref="Infrastructure.Problems.Handlers.ProblemExceptionHandler"/>
/// turns it into ProblemDetails with <see cref="Code"/>, so the UI reacts to the code, not the title. The message and
/// inner exception are logged at Information, since these are expected outcomes, not app errors.
/// </summary>
public abstract class ProblemException(
    int statusCode,
    string code,
    string title,
    string message,
    Exception? innerException
) : Exception(message, innerException)
{
    public int StatusCode { get; } = statusCode;

    public string Code { get; } = code;

    public string Title { get; } = title;
}
