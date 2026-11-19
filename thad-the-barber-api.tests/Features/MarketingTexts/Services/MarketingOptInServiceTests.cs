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

public sealed class MarketingOptInServiceTests : IDisposable
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

    public void Dispose() => _optIns.Dispose();

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheFirstOptInCreatesTheFileAsAJsonArray()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        JsonElement list = ReadList();
        Assert.Equal(JsonValueKind.Array, list.ValueKind);
        JsonElement entry = Assert.Single(list.EnumerateArray());
        Assert.Equal(FirstPhone, entry.GetProperty("phone").GetString());
        Assert.Equal("booking", entry.GetProperty("source").GetString());
        Assert.Equal(_time.GetUtcNow(), entry.GetProperty("consentedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task LaterOptInsAreAppendedToTheSameList()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);
        await _optIns.AddAsync(SecondPhone, MarketingOptInSource.SignUp, Cancellation);

        List<string?> phones = [.. ReadList().EnumerateArray().Select(entry => entry.GetProperty("phone").GetString())];
        Assert.Equal([FirstPhone, SecondPhone], phones);
    }

    [Fact]
    public async Task APhoneAlreadyOnTheListIsKeptOnceWithItsFirstConsent()
    {
        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);
        _time.Advance(TimeSpan.FromDays(3));

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.SignUp, Cancellation);

        JsonElement entry = Assert.Single(ReadList().EnumerateArray());
        Assert.Equal("booking", entry.GetProperty("source").GetString());
        Assert.Equal(new DateTimeOffset(2026, 11, 18, 15, 30, 45, TimeSpan.Zero), entry.GetProperty("consentedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task SimultaneousOptInsAreAllKept()
    {
        await Task.WhenAll(Enumerable.Range(0, 20).Select(index =>
            _optIns.AddAsync($"+155501002{index:00}", MarketingOptInSource.Booking, Cancellation)));

        Assert.Equal(20, ReadList().GetArrayLength());
    }

    [Fact]
    public async Task AStorageFailureIsLoggedWithoutThePhoneAndNotThrown()
    {
        _storage.Failure = new InvalidOperationException("storage is down");

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        FakeLogRecord record = Assert.Single(_logger.Collector.GetSnapshot());
        Assert.Equal(LogLevel.Warning, record.Level);
        Assert.DoesNotContain(FirstPhone, record.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ASignUpIsListedWithItsSource()
    {
        await _optIns.SignUpAsync(FirstPhone, Cancellation);

        JsonElement entry = Assert.Single(ReadList().EnumerateArray());
        Assert.Equal(FirstPhone, entry.GetProperty("phone").GetString());
        Assert.Equal("signUp", entry.GetProperty("source").GetString());
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
    public async Task AnUnreadableFileIsNotOverwritten()
    {
        _storage.ContentFiles[MarketingOptInService.FileName] = "not json";

        await _optIns.AddAsync(FirstPhone, MarketingOptInSource.Booking, Cancellation);

        Assert.Equal("not json", _storage.ContentFiles[MarketingOptInService.FileName]);
    }

    private JsonElement ReadList() => JsonDocument.Parse(_storage.ContentFiles[MarketingOptInService.FileName]).RootElement;
}
