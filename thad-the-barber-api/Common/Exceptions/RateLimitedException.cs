namespace ThadTheBarber.Api.Common.Exceptions;

/// <summary>
/// A limit decided inside a service rather than by the rate-limiter middleware, because it's keyed by something in the
/// request body. <see cref="Infrastructure.Problems.Handlers.ProblemExceptionHandler"/> adds <c>Retry-After</c>.
/// </summary>
public sealed class RateLimitedException(string message, TimeSpan retryAfter)
    : ProblemException(
        StatusCodes.Status429TooManyRequests,
        "rate_limited",
        "Too many requests. Try again later.",
        message,
        null
    )
{
    public TimeSpan RetryAfter { get; } = retryAfter;
}
