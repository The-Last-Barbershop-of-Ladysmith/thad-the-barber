using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ThadTheBarber.Api.Infrastructure.Problems.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;

namespace ThadTheBarber.Api.Twilio.Handlers;

/// <summary>
/// Turns Twilio failures into 503 <c>verification_unavailable</c> without saying what went wrong, so the customer can
/// try again later or use the shop's other ways to reach their booking.
/// </summary>
public sealed class TwilioExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not (TwilioNotConfiguredException or TwilioRequestFailedException))
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Text codes are unavailable right now.",
                Extensions = { [ProblemsSetup.CodeKey] = "verification_unavailable" },
            },
        });
    }
}
