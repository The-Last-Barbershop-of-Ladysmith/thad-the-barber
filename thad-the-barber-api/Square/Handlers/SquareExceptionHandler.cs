using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Square;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Square.Handlers;

/// <summary>
/// Turns Square failures from any endpoint into ProblemDetails, so endpoints call Square without catching:
/// not connected, Square down or timed out → 503 (try later or use the fallbacks, BR-14); Square rejecting our request
/// → 502.
/// </summary>
public sealed class SquareExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        (int status, string title)? problem = exception switch
        {
            SquareNotConnectedException => (StatusCodes.Status503ServiceUnavailable, "Booking is unavailable right now."),
            SquareApiException { StatusCode: >= StatusCodes.Status500InternalServerError } or HttpRequestException
                => (StatusCodes.Status503ServiceUnavailable, "Square is unavailable right now."),
            TaskCanceledException when !httpContext.RequestAborted.IsCancellationRequested
                => (StatusCodes.Status503ServiceUnavailable, "Square is unavailable right now."),
            SquareApiException => (StatusCodes.Status502BadGateway, "Square couldn't complete the request."),
            _ => null,
        };
        if (problem is not (int status, string title))
        {
            return false;
        }

        httpContext.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails { Status = status, Title = title },
        });
    }
}
