using System.Text.Json;
using ThadTheBarber.Api.Features.MarketingTexts.Models;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Exceptions;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Services;

public sealed class TextMessageSenderTests
{
    private const string Phone = "+15550100161";
    private const string Marker = "confirmations/BOOKING1.json";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task WhileTextsAreOffNothingIsSentOrClaimed()
    {
        TextHarness texts = TextHarness.Disabled();

        SendAttempt? attempt = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Disabled, attempt?.Outcome);
        Assert.Empty(texts.Twilio.Sent);
        Assert.Empty(texts.Storage.ContentFiles);
    }

    [Fact]
    public async Task ATextIsSentOnceAndItsMarkerRecordsTheMessageSid()
    {
        TextHarness texts = TextHarness.Create();

        SendAttempt? attempt = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Sent, attempt?.Outcome);
        FakeTwilioMessageService.SentText sent = Assert.Single(texts.Twilio.Sent);
        Assert.Equal((Phone, "Hi"), (sent.Phone, sent.Body));
        JsonElement marker = JsonDocument.Parse(texts.Storage.ContentFiles[Marker]).RootElement;
        Assert.Equal("sent", marker.GetProperty("state").GetString());
        Assert.Equal(sent.Sid, marker.GetProperty("messageSid").GetString());
    }

    [Fact]
    public async Task AMarkerAlreadyClaimedMeansNothingIsSentAgain()
    {
        TextHarness texts = TextHarness.Create();
        await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        SendAttempt? second = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Null(second);
        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task TwoCallersRacingForTheMarkerSendOneText()
    {
        TextHarness texts = TextHarness.Create();

        SendAttempt?[] attempts = await Task.WhenAll(Enumerable.Range(0, 8)
            .Select(_ => texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation)));

        Assert.Single(texts.Twilio.Sent);
        Assert.Single(attempts, attempt => attempt is not null);
    }

    [Fact]
    public async Task ARefusalGivesTheClaimBackSoARetryCanSend()
    {
        TextHarness texts = TextHarness.Create();
        texts.Twilio.Failure = new TwilioRequestFailedException(400, 21211);

        SendAttempt? refused = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);
        texts.Twilio.Failure = null;
        SendAttempt? retried = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Failed, refused?.Outcome);
        Assert.Equal(SendOutcome.Sent, retried?.Outcome);
        Assert.Single(texts.Twilio.Sent);
    }

    [Fact]
    public async Task ATwilioThatDidNotAnswerKeepsTheClaimSoTheTextIsNeverSentTwice()
    {
        TextHarness texts = TextHarness.Create();
        texts.Twilio.Failure = new TwilioRequestFailedException(0, null);

        SendAttempt? attempt = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);
        texts.Twilio.Failure = null;
        SendAttempt? retried = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Uncertain, attempt?.Outcome);
        Assert.Null(retried);
        Assert.Empty(texts.Twilio.Sent);
        Assert.Equal("claimed", JsonDocument.Parse(texts.Storage.ContentFiles[Marker]).RootElement.GetProperty("state").GetString());
    }

    [Fact]
    public async Task APhoneThatRepliedSTOPToTheSenderIsOptedOutAndTheMarkerSaysRefused()
    {
        TextHarness texts = TextHarness.Create();
        await texts.OptIns.SignUpAsync(Phone, Cancellation);
        texts.Twilio.Failure = new TwilioRequestFailedException(400, TextMessageSender.RecipientOptedOutErrorCode);

        SendAttempt? attempt = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.OptedOut, attempt?.Outcome);
        Assert.Empty(await texts.OptIns.ListActiveAsync(Cancellation));
        Assert.Equal("refused", JsonDocument.Parse(texts.Storage.ContentFiles[Marker]).RootElement.GetProperty("state").GetString());
    }

    [Fact]
    public async Task ATwilioWithNoSenderSetUpIsDisabledAndGivesTheClaimBack()
    {
        TextHarness texts = TextHarness.Create();
        texts.Twilio.Failure = new TwilioNotConfiguredException();

        SendAttempt? attempt = await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Disabled, attempt?.Outcome);
        Assert.DoesNotContain(Marker, texts.Storage.ContentFiles.Keys);
    }

    [Fact]
    public async Task TheLogHoldsTheMessageSidAndStatusButNeverThePhoneOrTheText()
    {
        TextHarness texts = TextHarness.Create();
        texts.Time.SetUtcNow(new DateTimeOffset(2026, 11, 18, 15, 0, 0, TimeSpan.Zero));

        await texts.Sender.SendOnceAsync(TextKind.Confirmation, Marker, "BOOKING1", Phone, "A private message", Cancellation);

        string log = texts.Storage.ContentFiles["messages/2026-11.jsonl"];
        JsonElement line = JsonDocument.Parse(log.Trim()).RootElement;
        Assert.Equal("confirmation", line.GetProperty("kind").GetString());
        Assert.Equal("BOOKING1", line.GetProperty("reference").GetString());
        Assert.Equal("sent", line.GetProperty("status").GetString());
        Assert.StartsWith("SM", line.GetProperty("messageSid").GetString(), StringComparison.Ordinal);
        Assert.DoesNotContain("5550100161", log, StringComparison.Ordinal);
        Assert.DoesNotContain("private", log, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AFailedLogWriteNeverUndoesASentText()
    {
        TextHarness texts = TextHarness.Create();
        SendAttempt attempt = await texts.Sender.TrySendAsync(TextKind.Announcement, "ANN1", Phone, "Hi", Cancellation);
        Assert.Equal(SendOutcome.Sent, attempt.Outcome);

        texts.Storage.Failure = new InvalidOperationException("storage is down");
        SendAttempt second = await texts.Sender.TrySendAsync(TextKind.Announcement, "ANN1", Phone, "Hi", Cancellation);

        Assert.Equal(SendOutcome.Sent, second.Outcome);
        Assert.Equal(2, texts.Twilio.Sent.Count);
    }
}
