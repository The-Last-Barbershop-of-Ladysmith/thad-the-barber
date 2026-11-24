namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// Texts announcements in the background: when one is requested (the signal), when the app starts (to finish a send a
/// restart interrupted), and every few minutes (for a scheduled announcement's day, or a send another instance dropped).
/// Between checks it does nothing, and while texts are off a check touches no storage.
/// </summary>
public sealed partial class AnnouncementTextWorker(
    AnnouncementTextService texts,
    AnnouncementTextSignal signal,
    TimeProvider time,
    ILogger<AnnouncementTextWorker> logger) : BackgroundService
{
    public static readonly TimeSpan CheckEvery = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using PeriodicTimer timer = new(CheckEvery, time);
        Task<bool> nextTick = timer.WaitForNextTickAsync(stoppingToken).AsTask();
        Task<bool> nextSignal = signal.Reader.WaitToReadAsync(stoppingToken).AsTask();
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await RunAsync(stoppingToken);
                Task finished = await Task.WhenAny(nextTick, nextSignal);
                if (finished == nextTick)
                {
                    nextTick = timer.WaitForNextTickAsync(stoppingToken).AsTask();
                }
                else
                {
                    signal.Reader.TryRead(out _);
                    nextSignal = signal.Reader.WaitToReadAsync(stoppingToken).AsTask();
                }
            }
        }
        catch (OperationCanceledException)
        {
            // The app is stopping.
        }
    }

    /// <summary>One check; a failure is logged as an error and the next check tries again.</summary>
    public async Task RunAsync(CancellationToken cancellationToken)
    {
        try
        {
            await texts.ProcessDueAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogFailed(logger, exception);
        }
    }

    [LoggerMessage(EventName = "AnnouncementTextsFailed", Level = LogLevel.Error, Message = "The announcement text check failed.")]
    private static partial void LogFailed(ILogger logger, Exception exception);
}
