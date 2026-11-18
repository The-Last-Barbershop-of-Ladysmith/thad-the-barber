using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.MarketingTexts.Services;

/// <summary>
/// Keeps the phones that agreed to the shop's news texts as one JSON array, <c>marketing-opt-ins.json</c> in the private
/// content container, so the list is ready when sending is built. A phone is listed once, with its first consent. The
/// file is read and replaced whole, so the lock keeps two simultaneous opt-ins from losing one (it covers this one app
/// instance, which is all the site runs on). A failure to save is logged without the phone and never thrown, because
/// the booking it came with has already been made.
/// </summary>
public sealed partial class MarketingOptInService(
    IMediaStorage storage,
    IOptions<MediaStorageSettings> settings,
    TimeProvider time,
    ILogger<MarketingOptInService> logger) : IDisposable
{
    public const string FileName = "marketing-opt-ins.json";

    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly SemaphoreSlim fileLock = new(1, 1);

    public async Task AddAsync(string phone, MarketingOptInSource source, CancellationToken cancellationToken)
    {
        await fileLock.WaitAsync(cancellationToken);
        try
        {
            string container = settings.Value.ContentContainerName;
            string? existingText = await storage.ReadTextAsync(container, FileName, cancellationToken);
            List<MarketingOptIn> optIns = [];
            if (existingText is not null)
            {
                optIns = JsonSerializer.Deserialize<List<MarketingOptIn>>(existingText, FileOptions) ?? [];
            }

            if (optIns.Any(optIn => optIn.Phone == phone))
            {
                return;
            }

            optIns.Add(new MarketingOptIn(
                phone,
                time.GetUtcNow(),
                source
            ));
            await storage.WriteTextAsync(container, FileName, JsonSerializer.Serialize(optIns, FileOptions), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotSaved(logger, exception, source);
        }
        finally
        {
            fileLock.Release();
        }
    }

    public void Dispose() => fileLock.Dispose();

    [LoggerMessage(EventName = "MarketingOptInNotSaved", Level = LogLevel.Warning, Message = "A news-texts opt-in from {Source} couldn't be saved.")]
    private static partial void LogNotSaved(ILogger logger, Exception exception, MarketingOptInSource source);
}
