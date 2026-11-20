using System.Reflection;
using Microsoft.Extensions.Logging;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Services;

/// <summary>The not-connected alert (infra/modules/square-alerts.bicep) matches these log events by EventName.</summary>
public sealed class SquareAlertEventTests
{
    private static readonly string[] AlertedEvents = ["SquareRefreshTokenRefused", "SquareSecretMissing"];

    [Fact]
    public void TheAlertsEventNamesAreTheProvidersWarnings()
    {
        string[] warnings = typeof(SquareAccessTokenProvider)
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Static)
            .Select(method => method.GetCustomAttribute<LoggerMessageAttribute>())
            .Where(attribute => attribute?.Level == LogLevel.Warning)
            .Select(attribute => attribute!.EventName!)
            .Order()
            .ToArray();

        Assert.Equal(AlertedEvents.Order(), warnings);
    }

    [Fact]
    public void TheAlertQueryMatchesThoseEventNames()
    {
        string bicep = RepoFiles.Read("infra", "modules", "square-alerts.bicep");

        Assert.All(AlertedEvents, name => Assert.Contains($"'{name}'", bicep));
    }
}
