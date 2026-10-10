using Azure;
using Azure.Identity;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Square;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Square.Handlers;

/// <summary>
/// Turns Square failures from any endpoint into ProblemDetails, so endpoints call Square without catching:
/// not connected, Key Vault unreachable, Square down or timed out → 503 (try later or use the fallbacks, BR-14); Square
/// rejecting our request → 502. Outcomes the customer can act on are <see cref="Common.Exceptions.ProblemException"/>s
/// with their own handler.
/// </summary>
public sealed class SquareExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails? problem = exception switch
        {
            SquareNotConnectedException or RequestFailedException or AuthenticationFailedException
                => Problem(StatusCodes.Status503ServiceUnavailable, "Booking is unavailable right now."),
            SquareApiException { StatusCode: >= StatusCodes.Status500InternalServerError } or HttpRequestException
                => Problem(StatusCodes.Status503ServiceUnavailable, "Square is unavailable right now."),
            TaskCanceledException when !httpContext.RequestAborted.IsCancellationRequested
                => Problem(StatusCodes.Status503ServiceUnavailable, "Square is unavailable right now."),
            SquareApiException => Problem(StatusCodes.Status502BadGateway, "Square couldn't complete the request."),
            _ => null,
        };
        if (problem is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }

    private static ProblemDetails Problem(int status, string title) => new()
    {
        Status = status,
        Title = title,
    };
}
