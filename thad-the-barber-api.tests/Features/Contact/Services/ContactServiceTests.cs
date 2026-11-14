using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.Contact.Exceptions;
using ThadTheBarber.Api.Features.Contact.Models;
using ThadTheBarber.Api.Features.Contact.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Contact.Services;

public sealed class ContactServiceTests
{
    private const string AnyName = "Quillon Vey-Ashgrove";
    private const string AnyEmail = "quillon@example.test";
    private const string AnyPhone = "+15550100163";

    private readonly FakeMediaStorage _storage = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 14, 15, 30, 45, TimeSpan.Zero));
    private readonly FakeLogger<ContactService> _logger = new();
    private readonly ContactService _contact;

    public ContactServiceTests()
    {
        _contact = new ContactService(_storage, Options.Create(FakeMediaStorageSettings.Create()), _time, _logger);
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task EachMessageIsItsOwnFileNamedByTimeAndId()
    {
        ContactReceipt receipt = await _contact.SendAsync(Question(), Cancellation);

        string fileName = Assert.Single(_storage.ContentFiles.Keys);
        Assert.Equal($"contact/20261114T153045Z-{receipt.Id:N}.json", fileName);
    }

    [Fact]
    public async Task TwoMessagesAtTheSameInstantDoNotShareAFile()
    {
        await _contact.SendAsync(Question(), Cancellation);
        await _contact.SendAsync(Question(), Cancellation);

        Assert.Equal(2, _storage.ContentFiles.Count);
    }

    [Fact]
    public async Task TheFileHoldsTheMessageTrimmedWithCamelCaseNamesAndNoEmptyFields()
    {
        ContactRequest request = new(ContactCategory.Issue, "  It froze.  ", $" {AnyName} ", AnyEmail, null, " /book ");

        ContactReceipt receipt = await _contact.SendAsync(request, Cancellation);

        using JsonDocument file = JsonDocument.Parse(Assert.Single(_storage.ContentFiles.Values));
        JsonElement root = file.RootElement;
        Assert.Equal(receipt.Id, root.GetProperty("id").GetGuid());
        Assert.Equal(_time.GetUtcNow(), root.GetProperty("receivedAt").GetDateTimeOffset());
        Assert.Equal("issue", root.GetProperty("category").GetString());
        Assert.Equal("It froze.", root.GetProperty("message").GetString());
        Assert.Equal(AnyName, root.GetProperty("name").GetString());
        Assert.Equal(AnyEmail, root.GetProperty("email").GetString());
        Assert.Equal("/book", root.GetProperty("pageOrBooking").GetString());
        Assert.False(root.TryGetProperty("phone", out JsonElement _));
    }

    [Theory]
    [InlineData(ContactCategory.Question, "Question")]
    [InlineData(ContactCategory.Issue, "Issue")]
    public async Task AQuestionOrIssueLogsTheCategoryAndFileNameOnly(ContactCategory category, string loggedCategory)
    {
        ContactRequest request = new(category, "Private words.", AnyName, AnyEmail, AnyPhone, "/book");

        await _contact.SendAsync(request, Cancellation);

        FakeLogRecord record = Assert.Single(_logger.Collector.GetSnapshot());
        Dictionary<string, string?> logged = record.StructuredState!.ToDictionary(pair => pair.Key, pair => pair.Value);
        Assert.Equal("ContactNeedsReply", record.Id.Name);
        Assert.Equal(LogLevel.Information, record.Level);
        Assert.Equal(loggedCategory, logged["Category"]);
        Assert.Equal(Assert.Single(_storage.ContentFiles.Keys), logged["FileName"]);
        Assert.Equal(["Category", "FileName", "{OriginalFormat}"], logged.Keys.Order(StringComparer.Ordinal).ToList());
        Assert.DoesNotContain("Private words", record.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(AnyName, record.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(AnyEmail, record.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FeedbackIsSavedWithoutAnAlertEvent()
    {
        ContactRequest request = new(ContactCategory.Feedback, "Nice chair.", null, null, null, null);

        await _contact.SendAsync(request, Cancellation);

        Assert.Single(_storage.ContentFiles);
        Assert.Empty(_logger.Collector.GetSnapshot());
    }

    [Fact]
    public async Task AFailedSaveIsContactUnavailableAndLogsNoAlertEvent()
    {
        InvalidOperationException storageFailure = new("Storage is down.");
        _storage.Failure = storageFailure;

        ContactUnavailableException thrown = await Assert.ThrowsAsync<ContactUnavailableException>(() => _contact.SendAsync(Question(), Cancellation));

        Assert.Same(storageFailure, thrown.InnerException);
        Assert.Empty(_logger.Collector.GetSnapshot());
    }

    [Fact]
    public async Task ACancelledSaveIsNotContactUnavailable()
    {
        _storage.Failure = new OperationCanceledException();

        await Assert.ThrowsAsync<OperationCanceledException>(() => _contact.SendAsync(Question(), Cancellation));
    }

    private static ContactRequest Question() =>
        new(ContactCategory.Question, "Made-up words.", AnyName, AnyEmail, null, null);
}
