using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Extensions;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// Wakes every few minutes, and at most once in each of the shop's <see cref="TextMessagesSettings.ReminderHours"/> asks
/// <see cref="ReminderService"/> to send what is due. The wake itself touches nothing (the check is the clock), so
/// the schedule costs no storage reads between runs. A failed run is logged as an error and tried again at the next
/// hour; the jobs are claimed one by one, so a second app instance running too sends nothing twice.
/// </summary>
public sealed partial class ReminderWorker(
    ReminderService reminders,
    ISquareService square,
    IOptions<TextMessagesSettings> settings,
    TimeProvider time,
    ILogger<ReminderWorker> logger) : BackgroundService
{
    public static readonly TimeSpan CheckEvery = TimeSpan.FromMinutes(5);

    private (DateOnly Day, int Hour)? _lastRun;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(CheckEvery, time);
        try
        {
            do
            {
                await RunIfDueAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // The app is stopping.
        }
    }

    /// <summary>Runs the reminders when this is the first check in one of the shop's reminder hours; returns whether it did.</summary>
    public async Task<bool> RunIfDueAsync(CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            return false;
        }

        try
        {
            ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
            TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone);
            DateTimeOffset now = time.GetUtcNow();
            (DateOnly Day, int Hour) slot = (zone.ToLocalDate(now), TimeZoneInfo.ConvertTime(now, zone).Hour);
            if (!settings.Value.ReminderHours.Contains(slot.Hour) || _lastRun == slot)
            {
                return false;
            }

            _lastRun = slot;
            int sent = await reminders.RunAsync(cancellationToken);
            LogRan(logger, sent);
            return true;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogFailed(logger, exception);
            return false;
        }
    }

    [LoggerMessage(EventName = "RemindersRan", Level = LogLevel.Information, Message = "The reminder run sent {Sent} reminders.")]
    private static partial void LogRan(ILogger logger, int sent);

    [LoggerMessage(EventName = "RemindersFailed", Level = LogLevel.Error, Message = "The reminder run failed.")]
    private static partial void LogFailed(ILogger logger, Exception exception);
}
