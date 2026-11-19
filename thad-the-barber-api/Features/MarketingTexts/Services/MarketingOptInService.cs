using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.MarketingTexts.Exceptions;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Configuration;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;

namespace ThadTheBarber.Api.Features.MarketingTexts.Services;

/// <summary>
/// Keeps who agreed to the shop's news texts as one small JSON blob per phone, <c>optins/&lt;sha256 of the phone&gt;.json</c> in
/// the private content container. Two people never share a blob, so simultaneous sign-ups can't lose each other, and
/// two changes to the same person are told apart by the blob's ETag: the later write finds the blob changed and reads
/// it again. The hash keeps phones out of blob names, which can reach logs. A phone is listed once with its first
/// consent; it is written again only when it agrees after having opted out. A failure to save a booking's opt-in is
/// logged without the phone and never thrown, because the booking has already been made; a failure to save a sign-up
/// throws, so the visitor is told.
/// </summary>
public sealed partial class MarketingOptInService(
    IMediaStorage storage,
    IOptions<MediaStorageSettings> settings,
    TimeProvider time,
    ILogger<MarketingOptInService> logger)
{
    public const string Prefix = "optins/";
    private const int MaxAttempts = 5;

    private static readonly JsonSerializerOptions FileOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    /// <summary>What names a phone's blob, and stands for the phone wherever it must be remembered without being kept (a send's progress).</summary>
    public static string HashFor(string phone) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(phone)));

    public static string BlobNameFor(string phone) => $"{Prefix}{HashFor(phone)}.json";

    public async Task AddAsync(string phone, MarketingOptInSource source, CancellationToken cancellationToken)
    {
        try
        {
            await SaveAsync(phone, source, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotSaved(logger, exception, source);
        }
    }

    public async Task SignUpAsync(string phone, CancellationToken cancellationToken)
    {
        try
        {
            await SaveAsync(phone, MarketingOptInSource.SignUp, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new MarketingSignUpUnavailableException(exception);
        }
    }

    /// <summary>Records that the phone replied STOP. A phone that never signed up has nothing to change, and nothing is written for it.</summary>
    public async Task OptOutAsync(string phone, CancellationToken cancellationToken)
    {
        string container = settings.Value.ContentContainerName;
        string blobName = BlobNameFor(phone);
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
            if (stored is null)
            {
                return;
            }

            MarketingOptIn current = Read(stored.Text);
            if (!current.IsActive)
            {
                return;
            }

            MarketingOptIn optedOut = current with { OptedOutAt = time.GetUtcNow() };
            if (await storage.TryReplaceTextAsync(container, blobName, Serialize(optedOut), stored.ETag, cancellationToken))
            {
                return;
            }
        }

        throw new InvalidOperationException("The opt-out kept conflicting with other changes.");
    }

    /// <summary>
    /// Puts back a phone that had opted out and now replies START. A phone that never signed up stays off the list: a
    /// reply to a booking text is not consent to news texts. True when the phone is listed again.
    /// </summary>
    public async Task<bool> OptInAgainAsync(string phone, CancellationToken cancellationToken)
    {
        string container = settings.Value.ContentContainerName;
        string blobName = BlobNameFor(phone);
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
            if (stored is null || Read(stored.Text).IsActive)
            {
                return false;
            }

            MarketingOptIn again = new(
                phone,
                time.GetUtcNow(),
                MarketingOptInSource.Reply,
                MarketingOptIn.CurrentConsentTextVersion,
                null
            );
            if (await storage.TryReplaceTextAsync(container, blobName, Serialize(again), stored.ETag, cancellationToken))
            {
                return true;
            }
        }

        throw new InvalidOperationException("The opt-in kept conflicting with other changes.");
    }

    /// <summary>The people the shop may text its news to now, oldest consent first.</summary>
    public async Task<List<MarketingOptIn>> ListActiveAsync(CancellationToken cancellationToken)
    {
        string container = settings.Value.ContentContainerName;
        List<StoredBlob> blobs = await storage.ListAsync(container, Prefix, cancellationToken);
        List<MarketingOptIn> active = [];
        foreach (StoredBlob blob in blobs)
        {
            string? text = await storage.ReadTextAsync(container, blob.Name, cancellationToken);
            if (text is not null && Read(text) is { IsActive: true } optIn)
            {
                active.Add(optIn);
            }
        }

        return [.. active.OrderBy(optIn => optIn.ConsentedAt)];
    }

    private async Task SaveAsync(string phone, MarketingOptInSource source, CancellationToken cancellationToken)
    {
        string container = settings.Value.ContentContainerName;
        string blobName = BlobNameFor(phone);
        MarketingOptIn fresh = new(
            phone,
            time.GetUtcNow(),
            source,
            MarketingOptIn.CurrentConsentTextVersion,
            null
        );
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            StoredText? stored = await storage.ReadTextWithETagAsync(container, blobName, cancellationToken);
            if (stored is null)
            {
                if (await storage.TryWriteNewTextAsync(container, blobName, Serialize(fresh), cancellationToken))
                {
                    return;
                }

                continue;
            }

            if (Read(stored.Text).IsActive)
            {
                return;
            }

            if (await storage.TryReplaceTextAsync(container, blobName, Serialize(fresh), stored.ETag, cancellationToken))
            {
                return;
            }
        }

        throw new InvalidOperationException("The opt-in kept conflicting with other changes.");
    }

    private static MarketingOptIn Read(string text) =>
        JsonSerializer.Deserialize<MarketingOptIn>(text, FileOptions)
        ?? throw new JsonException("An opt-in blob was empty.");

    private static string Serialize(MarketingOptIn optIn) => JsonSerializer.Serialize(optIn, FileOptions);

    [LoggerMessage(EventName = "MarketingOptInNotSaved", Level = LogLevel.Warning, Message = "A news-texts opt-in from {Source} couldn't be saved.")]
    private static partial void LogNotSaved(ILogger logger, Exception exception, MarketingOptInSource source);
}
