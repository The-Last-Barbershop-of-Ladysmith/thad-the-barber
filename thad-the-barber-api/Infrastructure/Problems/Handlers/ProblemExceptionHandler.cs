using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Infrastructure.Problems.Handlers;

public sealed partial class ProblemExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<ProblemExceptionHandler> logger
) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ProblemException problemException)
        {
            return false;
        }

        LogProblemReturned(logger, problemException, problemException.StatusCode, problemException.Code);
        ProblemDetails problem = new()
        {
            Status = problemException.StatusCode,
            Title = problemException.Title,
        };
        problem.Extensions["code"] = problemException.Code;

        httpContext.Response.StatusCode = problemException.StatusCode;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }

    [LoggerMessage(EventName = "ProblemReturned", Level = LogLevel.Information, Message = "Returned {StatusCode} {Code}.")]
    private static partial void LogProblemReturned(ILogger logger, Exception exception, int statusCode, string code);
}
