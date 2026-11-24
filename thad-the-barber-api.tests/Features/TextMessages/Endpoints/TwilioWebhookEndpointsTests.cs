using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Endpoints;

public sealed class TwilioWebhookEndpointsTests
{
    private const string Incoming = "/api/webhooks/twilio/incoming";
    private const string Status = "/api/webhooks/twilio/status";
    private const string Phone = "+15550100171";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASignedSTOPOptsThePhoneOutAndAnswersWithAnEmptyTwiml()
    {
        (FakeMediaStorage media, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = "STOP", ["OptOutType"] = "STOP" }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/xml", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("<Response></Response>", await response.Content.ReadAsStringAsync(Cancellation));
        Assert.Empty(await optIns.ListActiveAsync(Cancellation));
        Assert.Single(media.ContentFiles, file => file.Key.StartsWith("optins/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task WithoutTwilioSOptOutTypeTheBodysOwnWordCounts()
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = " unsubscribe " }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task ARepliedHELPOrAnythingElseChangesNothing()
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();

        using HttpResponseMessage help = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = "HELP", ["OptOutType"] = "HELP" }), Cancellation);
        using HttpResponseMessage chat = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = "see you at 3" }), Cancellation);

        Assert.Equal(HttpStatusCode.OK, help.StatusCode);
        Assert.Equal(HttpStatusCode.OK, chat.StatusCode);
        Assert.Single(await optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task STARTPutsAPhoneThatOptedOutBackOnTheList()
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();
        await optIns.OptOutAsync(Phone, Cancellation);

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = "START", ["OptOutType"] = "START" }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Phone, Assert.Single(await optIns.ListActiveAsync(Cancellation)).Phone);
    }

    [Fact]
    public async Task STARTFromAPhoneThatNeverSignedUpDoesNotAddItToTheNewsList()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        using HttpClient client = api.WithTwilioWebhooks().CreateClient();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = "START", ["OptOutType"] = "START" }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(media.ContentFiles.Keys, name => name.StartsWith("optins/", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("wrong-signature")]
    [InlineData(null)]
    public async Task ACallWithABadOrMissingSignatureIs401AndChangesNothing(string? signature)
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.Request(Incoming, new() { ["From"] = Phone, ["Body"] = "STOP" }, signature),
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 401, "invalid_signature");
        Assert.Single(await optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task ASignatureForDifferentFieldsIsRefused()
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();
        string signatureForAnotherBody = TwilioWebhooks.Sign(TwilioWebhooks.BaseUrl + Incoming, new() { ["From"] = Phone, ["Body"] = "hello" });

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.Request(Incoming, new() { ["From"] = Phone, ["Body"] = "STOP" }, signatureForAnotherBody),
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 401, "invalid_signature");
        Assert.Single(await optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task WithoutAnAuthTokenOrWebhookAddressTheWebhooksAre503()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClientWithoutToken();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.Request(Incoming, new() { ["From"] = Phone, ["Body"] = "STOP" }, "anything"),
            Cancellation);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task ABodyOverTheWebhookCapIs413()
    {
        using ApiFactory api = new();
        using HttpClient client = api.WithTwilioWebhooks().CreateClient();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Incoming, new() { ["From"] = Phone, ["Body"] = new string('x', 40_000) }),
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 413, "payload_too_large");
    }

    [Fact]
    public async Task ADeliveredReportIsLoggedByMessageSidWithoutAnyPhone()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        using HttpClient client = api.WithTwilioWebhooks().CreateClient();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Status, new() { ["MessageSid"] = "SMabc", ["MessageStatus"] = "delivered", ["To"] = Phone }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string log = Assert.Single(media.ContentFiles, file => file.Key.StartsWith("messages/", StringComparison.Ordinal)).Value;
        Assert.Contains("\"kind\":\"delivery\"", log, StringComparison.Ordinal);
        Assert.Contains("\"messageSid\":\"SMabc\"", log, StringComparison.Ordinal);
        Assert.Contains("\"status\":\"delivered\"", log, StringComparison.Ordinal);
        Assert.DoesNotContain("5550100171", log, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnUndeliveredReportIsLoggedAndWarnedWithTheErrorCodeButNotThePhone()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        WebApplicationFactoryHandle host = new(api);
        using HttpClient client = host.Client;

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Status, new() { ["MessageSid"] = "SMabc", ["MessageStatus"] = "undelivered", ["ErrorCode"] = "30003", ["To"] = Phone }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("undelivered-30003", Assert.Single(media.ContentFiles, file => file.Key.StartsWith("messages/", StringComparison.Ordinal)).Value, StringComparison.Ordinal);
        FakeLogRecord warning = Assert.Single(host.Logs.GetSnapshot(), record => record.Id.Name == "TextNotDelivered");
        Assert.Equal(LogLevel.Warning, warning.Level);
        Assert.Contains("30003", warning.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("5550100171", warning.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AReportThatNamesTwilioSOptOutErrorOptsTheRecipientOut()
    {
        (_, HttpClient client, MarketingOptInService optIns) = await HostWithSignedUpPhoneAsync();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Status, new() { ["MessageSid"] = "SMabc", ["MessageStatus"] = "failed", ["ErrorCode"] = "21610", ["To"] = Phone }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await optIns.ListActiveAsync(Cancellation));
    }

    [Fact]
    public async Task AQueuedOrSentReportIsIgnoredAsNotFinal()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        using HttpClient client = api.WithTwilioWebhooks().CreateClient();

        using HttpResponseMessage response = await client.SendAsync(
            TwilioWebhooks.SignedRequest(Status, new() { ["MessageSid"] = "SMabc", ["MessageStatus"] = "queued" }),
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain(media.ContentFiles.Keys, name => name.StartsWith("messages/", StringComparison.Ordinal));
    }

    private static async Task<(FakeMediaStorage Media, HttpClient Client, MarketingOptInService OptIns)> HostWithSignedUpPhoneAsync()
    {
        FakeMediaStorage media = new();
        ApiFactory api = new(media: media);
        Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> host = api.WithTwilioWebhooks();
        MarketingOptInService optIns = host.Services.GetRequiredService<MarketingOptInService>();
        await optIns.SignUpAsync(Phone, Cancellation);
        return (media, host.CreateClient(), optIns);
    }

    private sealed class WebApplicationFactoryHandle
    {
        public WebApplicationFactoryHandle(ApiFactory api)
        {
            Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> host = api.WithTwilioWebhooks()
                .WithWebHostBuilder(builder => builder.ConfigureServices(services => services.AddLogging(logging => logging.AddFakeLogging())));
            Client = host.CreateClient();
            Logs = host.Services.GetFakeLogCollector();
        }

        public HttpClient Client { get; }

        public FakeLogCollector Logs { get; }
    }
}
