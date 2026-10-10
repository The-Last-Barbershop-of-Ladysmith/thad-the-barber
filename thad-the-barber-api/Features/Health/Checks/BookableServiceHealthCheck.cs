using Microsoft.Extensions.Diagnostics.HealthChecks;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.Health.Checks;

/// <summary>Unhealthy when the Square catalog doesn't name the shop's one bookable service, so nobody can book.</summary>
public sealed class BookableServiceHealthCheck(BookableServiceResolver resolver) : IHealthCheck
{
    public const string Name = "bookableService";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            await resolver.ResolveAsync(cancellationToken);
            return HealthCheckResult.Healthy("The bookable service is resolved.");
        }
        catch (BookableServiceNotResolvedException exception)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, exception.Message, exception);
        }
    }
}
