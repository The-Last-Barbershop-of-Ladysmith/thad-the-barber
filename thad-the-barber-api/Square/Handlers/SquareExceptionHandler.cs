using Azure;
using Azure.Identity;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Square;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Square.Handlers;

/// <summary>
/// Turns Square failures from any endpoint into ProblemDetails, so endpoints call Square without catching:
/// a taken time → 409 <c>slot_unavailable</c>; customer details Square refused → 400 <c>invalid_customer_details</c>;
/// not connected, Key Vault unreachable, Square down or timed out → 503 (try later or use the fallbacks, BR-14); Square
/// rejecting our request → 502. The <c>code</c> lets the UI react without reading the title.
/// </summary>
public sealed class SquareExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails? problem = exception switch
        {
            SlotUnavailableException
                => Problem(StatusCodes.Status409Conflict, "That time is no longer available.", "slot_unavailable"),
            InvalidCustomerDetailsException
                => Problem(StatusCodes.Status400BadRequest, "Square couldn't accept the name or phone.", "invalid_customer_details"),
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

    private static ProblemDetails Problem(int status, string title, string? code = null)
    {
        ProblemDetails problem = new()
        {
            Status = status,
            Title = title,
        };
        if (code is not null)
        {
            problem.Extensions["code"] = code;
        }

        return problem;
    }
}
