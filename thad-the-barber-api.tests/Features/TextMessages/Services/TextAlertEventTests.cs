using System.Reflection;
using Microsoft.Extensions.Logging;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

/// <summary>The text alerts (infra/modules/text-alerts.bicep) match these log events by EventName.</summary>
public sealed class TextAlertEventTests
{
    private static readonly string[] AlertedEvents =
    [
        "TextUnreachable",
        "TextRefused",
        "RemindersFailed",
        "AnnouncementTextsFailed",
        "BookingTextNotHandled",
        "TextNotDelivered",
        "RemindersRan",
    ];

    [Fact]
    public void EveryAlertedEventIsLoggedByTheApi()
    {
        string[] logged = typeof(TextMessageSender).Assembly
            .GetTypes()
            .SelectMany(type => type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Select(method => method.GetCustomAttribute<LoggerMessageAttribute>()?.EventName)
            .OfType<string>()
            .ToArray();

        Assert.All(AlertedEvents, name => Assert.Contains(name, logged));
    }

    [Fact]
    public void TheAlertQueriesNameEveryAlertedEvent()
    {
        string bicep = RepoFiles.Read("infra", "modules", "text-alerts.bicep");

        Assert.All(AlertedEvents, name => Assert.Contains($"'{name}'", bicep));
    }
}
