using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.MarketingTexts.Services;

public sealed class LegacyOptInImporterTests : IDisposable
{
    private const string FirstPhone = "+15550100191";
    private const string SecondPhone = "+15550100192";

    private const string OldFile = """
        [
          { "phone": "+15550100191", "consentedAt": "2026-11-15T14:00:00+00:00", "source": "booking" },
          { "phone": "+15550100192", "consentedAt": "2026-11-17T09:30:00+00:00", "source": "signUp" }
        ]
        """;

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 19, 12, 0, 0, TimeSpan.Zero));
    private readonly LegacyOptInImporter _importer;
    private readonly MarketingOptInService _optIns;
    private readonly MarketingOptInService _lazyOptIns;

    public LegacyOptInImporterTests()
    {
        IOptions<ThadTheBarber.Api.Infrastructure.Storage.Configuration.MediaStorageSettings> settings = Options.Create(FakeMediaStorageSettings.Create());
        _importer = new LegacyOptInImporter(_storage, settings, NullLogger<LegacyOptInImporter>.Instance);
        _optIns = new MarketingOptInService(_storage, settings, _time, NullLogger<MarketingOptInService>.Instance);
        _lazyOptIns = new MarketingOptInService(_storage, settings, _time, NullLogger<MarketingOptInService>.Instance, _importer);
    }

    public void Dispose() => _importer.Dispose();

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task EachPhoneInTheOldFileGetsItsOwnBlobWithItsConsentTimeAndSource()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;

        int imported = await _importer.ImportAsync(Cancellation);

        Assert.Equal(2, imported);
        MarketingOptIn first = Assert.Single(await _optIns.ListActiveAsync(Cancellation), optIn => optIn.Phone == FirstPhone);
        Assert.Equal(new DateTimeOffset(2026, 11, 15, 14, 0, 0, TimeSpan.Zero), first.ConsentedAt);
        Assert.Equal(MarketingOptInSource.Booking, first.Source);
        Assert.Equal(LegacyOptInImporter.ImportedConsentTextVersion, first.ConsentTextVersion);
        Assert.Equal(2, (await _optIns.ListActiveAsync(Cancellation)).Count);
    }

    [Fact]
    public async Task TheOldFileIsKeptAsTheRecordOfWhatWasImported()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;

        await _importer.ImportAsync(Cancellation);

        Assert.Equal(OldFile, _storage.ContentFiles[LegacyOptInImporter.LegacyFileName]);
        Assert.Contains(LegacyOptInImporter.DoneMarker, _storage.ContentFiles.Keys);
    }

    [Fact]
    public async Task ASecondRunDoesNothing()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;
        await _importer.ImportAsync(Cancellation);
        int callsBefore = _storage.Calls;

        int second = await _importer.ImportAsync(Cancellation);

        Assert.Equal(0, second);
        Assert.Equal(callsBefore + 1, _storage.Calls);
    }

    [Fact]
    public async Task APhoneThatAlreadyHasABlobIsLeftAsItIs()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        await _optIns.OptOutAsync(FirstPhone, Cancellation);
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;

        int imported = await _importer.ImportAsync(Cancellation);

        Assert.Equal(1, imported);
        JsonElement blob = JsonDocument.Parse(_storage.ContentFiles[MarketingOptInService.BlobNameFor(FirstPhone)]).RootElement;
        Assert.NotEqual(JsonValueKind.Null, blob.GetProperty("optedOutAt").ValueKind);
        Assert.Equal(SecondPhone, Assert.Single(await _optIns.ListActiveAsync(Cancellation)).Phone);
    }

    [Fact]
    public async Task WithNoOldFileThereIsNothingToDoAndNothingIsWritten()
    {
        int imported = await _importer.ImportAsync(Cancellation);

        Assert.Equal(0, imported);
        Assert.Empty(_storage.ContentFiles);
    }

    [Fact]
    public async Task TheFirstOptInOperationBringsTheOldPhonesInAndLaterOnesDoNotReadTheOldFileAgain()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;

        List<MarketingOptIn> first = await _lazyOptIns.ListActiveAsync(Cancellation);
        int callsAfterFirst = _storage.Calls;
        await _lazyOptIns.ListActiveAsync(Cancellation);

        Assert.Equal(2, first.Count);
        // The second listing reads the two phones' blobs and the folder, and nothing for the import.
        Assert.Equal(callsAfterFirst + 3, _storage.Calls);
    }

    [Fact]
    public async Task ASignUpStillWorksWhenTheOldFileCantBeImported()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = "not json";

        await _lazyOptIns.SignUpAsync(FirstPhone, Cancellation);

        Assert.Equal(FirstPhone, Assert.Single(await _optIns.ListActiveAsync(Cancellation)).Phone);
    }

    [Fact]
    public async Task AStorageFailureLeavesItUnmarkedSoTheNextStartTriesAgain()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = OldFile;
        _storage.Failure = new InvalidOperationException("storage is down");

        await _importer.EnsureImportedAsync(Cancellation);
        _storage.Failure = null;

        Assert.DoesNotContain(LegacyOptInImporter.DoneMarker, _storage.ContentFiles.Keys);
        Assert.Equal(2, await _importer.ImportAsync(Cancellation));
    }

    [Fact]
    public async Task AnUnreadableOldFileIsNotMarkedDone()
    {
        _storage.ContentFiles[LegacyOptInImporter.LegacyFileName] = "not json";

        await _importer.EnsureImportedAsync(Cancellation);

        Assert.DoesNotContain(LegacyOptInImporter.DoneMarker, _storage.ContentFiles.Keys);
    }
}
