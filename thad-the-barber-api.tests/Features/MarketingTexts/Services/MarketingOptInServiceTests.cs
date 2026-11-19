using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.MarketingTexts.Exceptions;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.MarketingTexts.Services;

public sealed class MarketingOptInServiceTests
{
    private const string FirstPhone = "+15550100141";
    private const string SecondPhone = "+15550100142";

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 18, 15, 30, 45, TimeSpan.Zero));
    private readonly FakeLogger<MarketingOptInService> _logger = new();
    private readonly MarketingOptInService _optIns;

    public MarketingOptInServiceTests()
    {
        _optIns = new MarketingOptInService(_storage, Options.Create(FakeMediaStorageSettings.Create()), _time, _logger);
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task EachPhoneGetsItsOwnBlobNamedByAHashSoThePhoneNeverAppearsInTheName()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);
        await _optIns.AddAsync(SecondPhone, MarketingOptInSource.SignUp, Cancellation);

        Assert.Equal(2, _storage.ContentFiles.Count);
        Assert.All(_storage.ContentFiles.Keys, name =>
        {
            Assert.StartsWith(MarketingOptInService.Prefix, name, StringComparison.Ordinal);
            Assert.DoesNotContain("5550100", name, StringComparison.Ordinal);
        });
        Assert.NotEqual(MarketingOptInService.BlobNameFor(FirstPhone), MarketingOptInService.BlobNameFor(SecondPhone));
    }

    [Fact]
    public async Task TheBlobHoldsThePhoneItsConsentTimeSourceAndTextVersion()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        JsonElement entry = ReadBlob(FirstPhone);
        Assert.Equal(FirstPhone, entry.GetProperty("phone").GetString());
        Assert.Equal("booking", entry.GetProperty("source").GetString());
        Assert.Equal(_time.GetUtcNow(), entry.GetProperty("consentedAt").GetDateTimeOffset());
        Assert.Equal(MarketingOptIn.CurrentConsentTextVersion, entry.GetProperty("consentTextVersion").GetString());
        Assert.Equal(JsonValueKind.Null, entry.GetProperty("optedOutAt").ValueKind);
    }

    [Fact]
    public async Task APhoneAlreadyListedIsKeptOnceWithItsFirstConsent()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);
        _time.Advance(TimeSpan.FromDays(3));
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.SignUp, Cancellation);

        JsonElement entry = ReadBlob(FirstPhone);
        Assert.Equal("booking", entry.GetProperty("source").GetString());
        Assert.Equal(new DateTimeOffset(2026, 11, 18, 15, 30, 45, TimeSpan.Zero), entry.GetProperty("consentedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task SimultaneousOptInsAreAllKept()
    {
        await Task.WhenAll(Enumerable.Range(0, 20).Select(index =>
            _optIns.AddAsync($"+155501002{index:00}", MarketingOptInSource.Booking, Cancellation)));

        Assert.Equal(20, (await _optIns.ListActiveAsync(Cancellation)).Count);
    }

    [Fact]
    public async Task ASignUpIsListedWithItsSource()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);

        Assert.Equal("signUp", ReadBlob(FirstPhone).GetProperty("source").GetString());
    }

    [Fact]
    public async Task AStorageFailureOnABookingsOptInIsLoggedWithoutThePhoneAndNotThrown()
    {
        _storage.Failure = new InvalidOperationException("storage is down");

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        FakeLogRecord record = Assert.Single(_logger.Collector.GetSnapshot());
        Assert.Equal(LogLevel.Warning, record.Level);
        Assert.DoesNotContain(FirstPhone, record.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AStorageFailureOnASignUpThrowsWithoutLoggingThePhone()
    {
        _storage.Failure = new InvalidOperationException("storage is down");

        MarketingSignUpUnavailableException thrown = await Assert.ThrowsAsync<MarketingSignUpUnavailableException>(
            () => _optIns.SignUpAsync(FirstPhone, Cancellation));

        Assert.Same(_storage.Failure, thrown.InnerException);
        Assert.DoesNotContain(FirstPhone, thrown.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnUnreadableBlobIsNotOverwritten()
    {
        string blobName = MarketingOptInService.BlobNameFor(FirstPhone);
        _storage.ContentFiles[blobName] = "not json";

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        Assert.Equal("not json", _storage.ContentFiles[blobName]);
    }

    [Fact]
    public async Task OptingOutKeepsTheConsentAndRecordsWhenTheyOptedOut()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        _time.Advance(TimeSpan.FromDays(2));

        await _optIns.OptOutAsync(FirstPhone, Cancellation);

        JsonElement entry = ReadBlob(FirstPhone);
        Assert.Equal(new DateTimeOffset(2026, 11, 18, 15, 30, 45, TimeSpan.Zero), entry.GetProperty("consentedAt").GetDateTimeOffset());
        Assert.Equal(_time.GetUtcNow(), entry.GetProperty("optedOutAt").GetDateTimeOffset());
        Assert.Empty(await _optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task OptingOutAPhoneThatNeverSignedUpWritesNothing()
    {
        await _optIns.OptOutAsync(FirstPhone, Cancellation);

        Assert.Empty(_storage.ContentFiles);
    }

    [Fact]
    public async Task OptingOutTwiceKeepsTheFirstOptOutTime()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        await _optIns.OptOutAsync(FirstPhone, Cancellation);
        DateTimeOffset firstOptOut = _time.GetUtcNow();
        _time.Advance(TimeSpan.FromDays(1));

        await _optIns.OptOutAsync(FirstPhone, Cancellation);

        Assert.Equal(firstOptOut, ReadBlob(FirstPhone).GetProperty("optedOutAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task AgreeingAgainAfterOptingOutListsThePhoneAsNewConsent()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        await _optIns.OptOutAsync(FirstPhone, Cancellation);
        _time.Advance(TimeSpan.FromDays(10));

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Reply, Cancellation);

        MarketingOptIn active = Assert.Single(await _optIns.ListActiveAsync(Cancellation));
        Assert.Equal(_time.GetUtcNow(), active.ConsentedAt);
        Assert.Equal(MarketingOptInSource.Reply, active.Source);
        Assert.Null(active.OptedOutAt);
    }

    [Fact]
    public async Task AnOptOutThatRacesAnotherChangeReadsTheBlobAgainAndStillLands()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        string blobName = MarketingOptInService.BlobNameFor(FirstPhone);
        _storage.BeforeNextReplace = () => _storage.ContentFiles[blobName] += " ";

        await _optIns.OptOutAsync(FirstPhone, Cancellation);

        Assert.Empty(await _optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task ListingOmitsThoseWhoOptedOutAndOrdersByConsent()
    {
        await _optIns.SignUpAsync(SecondPhone, Cancellation);
        _time.Advance(TimeSpan.FromHours(1));
        await _optIns.SignUpAsync(FirstPhone, Cancellation);
        await _optIns.SignUpAsync("+15550100143", Cancellation);
        await _optIns.OptOutAsync("+15550100143", Cancellation);

        List<string> phones = [.. (await _optIns.ListActiveAsync(Cancellation)).Select(optIn => optIn.Phone)];

        Assert.Equal([SecondPhone, FirstPhone], phones);
    }

    private JsonElement ReadBlob(string phone) =>
        JsonDocument.Parse(_storage.ContentFiles[MarketingOptInService.BlobNameFor(phone)]).RootElement;
}
