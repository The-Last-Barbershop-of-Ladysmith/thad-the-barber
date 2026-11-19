using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.MarketingTexts.Services;

/// <summary>
/// Moves the old <c>marketing-opt-ins.json</c> (one array of everyone) into the one-blob-per-phone layout, once. The
/// sign-up was already live when the layout changed, so those phones agreed and must keep their consent time and source.
/// A phone that already has its own blob (someone signed up again, or opted out, since) is left exactly as it is, which
/// also makes a second run harmless; <see cref="DoneMarker"/> stops it from reading the old file on every start once it was imported (with no old file nothing is written at all). The old
/// file is left in place as the record of what was imported.
/// </summary>
public sealed partial class LegacyOptInImporter(
    IMediaStorage storage,
    IOptions<MediaStorageSettings> settings,
    ILogger<LegacyOptInImporter> logger) : IDisposable
{
    public const string LegacyFileName = "marketing-opt-ins.json";
    public const string DoneMarker = "optins-import-done.json";
    public const string ImportedConsentTextVersion = "legacy";

    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly SemaphoreSlim _lock = new(1, 1);
    private bool _isDone;

    public void Dispose() => _lock.Dispose();

    /// <summary>
    /// Makes sure the old file has been imported in this process, before the first opt-in is read or written. Nothing
    /// runs at startup, so an environment that never sees an opt-in never reads the old file. A failure is logged and
    /// tried again at the next opt-in; it never stops the opt-in itself.
    /// </summary>
    public async Task EnsureImportedAsync(CancellationToken cancellationToken)
    {
        if (_isDone)
        {
            return;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_isDone)
            {
                return;
            }

            int imported = await ImportAsync(cancellationToken);
            _isDone = true;
            if (imported > 0)
            {
                LogImported(logger, imported);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogFailed(logger, exception);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>Imports what the old file holds; returns how many phones got a blob. Throws when storage fails, so nothing is marked done.</summary>
    public async Task<int> ImportAsync(CancellationToken cancellationToken)
    {
        string container = settings.Value.ContentContainerName;
        if (await storage.ReadTextAsync(container, DoneMarker, cancellationToken) is not null)
        {
            return 0;
        }

        string? text = await storage.ReadTextAsync(container, LegacyFileName, cancellationToken);
        if (text is null)
        {
            return 0;
        }

        int imported = 0;
        List<LegacyMarketingOptIn> entries = JsonSerializer.Deserialize<List<LegacyMarketingOptIn>>(text, FileOptions) ?? [];
        foreach (LegacyMarketingOptIn entry in entries)
        {
            MarketingOptIn optIn = new(
                entry.Phone,
                entry.ConsentedAt,
                entry.Source,
                ImportedConsentTextVersion,
                null
            );
            if (await storage.TryWriteNewTextAsync(
                container,
                MarketingOptInService.BlobNameFor(entry.Phone),
                JsonSerializer.Serialize(optIn, FileOptions),
                cancellationToken))
            {
                imported++;
            }
        }

        await storage.TryWriteNewTextAsync(container, DoneMarker, JsonSerializer.Serialize(new { importedCount = imported }, FileOptions), cancellationToken);
        return imported;
    }

    [LoggerMessage(EventName = "LegacyOptInsImported", Level = LogLevel.Information, Message = "Imported {Count} news-text opt-ins from the old single file.")]
    private static partial void LogImported(ILogger logger, int count);

    [LoggerMessage(EventName = "LegacyOptInImportFailed", Level = LogLevel.Error, Message = "The old news-text opt-ins couldn't be imported; they will be tried again at the next opt-in.")]
    private static partial void LogFailed(ILogger logger, Exception exception);
}
