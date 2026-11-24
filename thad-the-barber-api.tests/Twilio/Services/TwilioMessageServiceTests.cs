using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.Twilio.Services;

public sealed class TwilioMessageServiceTests
{
    private const string Phone = "+15555550123";
    private const string AccountSid = "AC0000000000000000000000000000000f";
    private const string ApiKeySid = "SK0000000000000000000000000000000f";
    private const string ApiKeySecret = "made-up-secret";
    private const string MessagingServiceSid = "MG0000000000000000000000000000000f";
    private const string MessageBody = "Your cut is confirmed. Reply STOP to opt out.";
    private const string CreatedMessage = """{"sid":"SM0000000000000000000000000000000f","status":"queued"}""";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ATextGoesToTheAccountsMessagesWithTheMessagingServiceAndReturnsTheSid()
    {
        FakeTwilioHttp http = new() { Body = CreatedMessage };

        string sid = await Service(http, MessagingServiceSettings()).SendAsync(Phone, MessageBody, Cancellation);

        Assert.Equal("SM0000000000000000000000000000000f", sid);
        RecordedRequest request = Assert.Single(http.Requests);
        Assert.Equal($"/2010-04-01/Accounts/{AccountSid}/Messages.json", request.Path);
        Assert.Contains("To=%2B15555550123", request.Body, StringComparison.Ordinal);
        Assert.Contains($"MessagingServiceSid={MessagingServiceSid}", request.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("From=", request.Body, StringComparison.Ordinal);
        Assert.Contains("Body=Your+cut+is+confirmed", request.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task WithoutAMessagingServiceItSendsFromTheSenderNumber()
    {
        FakeTwilioHttp http = new() { Body = CreatedMessage };
        TwilioSettings settings = MessagingServiceSettings();
        settings.MessagingServiceSid = string.Empty;
        settings.FromNumber = "+15005550006";

        await Service(http, settings).SendAsync(Phone, MessageBody, Cancellation);

        RecordedRequest request = Assert.Single(http.Requests);
        Assert.Contains("From=%2B15005550006", request.Body, StringComparison.Ordinal);
        Assert.DoesNotContain("MessagingServiceSid", request.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task TheStatusCallbackIsSentWithTheTextWhenSet()
    {
        FakeTwilioHttp http = new() { Body = CreatedMessage };
        TwilioSettings settings = MessagingServiceSettings();
        settings.WebhookBaseUrl = "https://api.example.com/";

        await Service(http, settings).SendAsync(Phone, MessageBody, Cancellation);

        Assert.Contains("StatusCallback=https%3A%2F%2Fapi.example.com%2Fapi%2Fwebhooks%2Ftwilio%2Fstatus", Assert.Single(http.Requests).Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RequestsAreSignedWithTheApiKey()
    {
        FakeTwilioHttp http = new() { Body = CreatedMessage };

        await Service(http, MessagingServiceSettings()).SendAsync(Phone, MessageBody, Cancellation);

        string expected = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKeySid}:{ApiKeySecret}"));
        Assert.Equal(expected, Assert.Single(http.Requests).Token);
    }

    [Fact]
    public async Task ARefusalKeepsOnlyTheStatusAndTwilioErrorCodeNotTheTextOrPhone()
    {
        FakeTwilioHttp http = new()
        {
            Status = HttpStatusCode.BadRequest,
            Body = $$"""{"code":21610,"message":"{{Phone}} replied STOP to the text '{{MessageBody}}'.","status":400}""",
        };

        TwilioRequestFailedException failure = await Assert.ThrowsAsync<TwilioRequestFailedException>(
            () => Service(http, MessagingServiceSettings()).SendAsync(Phone, MessageBody, Cancellation));

        Assert.Equal(400, failure.StatusCode);
        Assert.Equal(21610, failure.TwilioErrorCode);
        Assert.DoesNotContain("5550123", failure.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("confirmed", failure.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task ATwilioThatIsDownOrTimingOutIsARequestFailureWithStatusZero(bool isDown, bool isTimingOut)
    {
        FakeTwilioHttp http = new() { IsDown = isDown, IsTimingOut = isTimingOut };

        TwilioRequestFailedException failure = await Assert.ThrowsAsync<TwilioRequestFailedException>(
            () => Service(http, MessagingServiceSettings()).SendAsync(Phone, MessageBody, Cancellation));

        Assert.Equal(0, failure.StatusCode);
        Assert.Null(failure.TwilioErrorCode);
    }

    [Fact]
    public async Task WithoutAMessagingServiceOrSenderNumberNothingIsSent()
    {
        FakeTwilioHttp http = new();
        TwilioSettings settings = MessagingServiceSettings();
        settings.MessagingServiceSid = string.Empty;

        await Assert.ThrowsAsync<TwilioNotConfiguredException>(() => Service(http, settings).SendAsync(Phone, MessageBody, Cancellation));
        Assert.Empty(http.Requests);
    }

    [Fact]
    public async Task ACancelledCallerSendsNothing()
    {
        FakeTwilioHttp http = new();
        using CancellationTokenSource cancelled = new();
        await cancelled.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Service(http, MessagingServiceSettings()).SendAsync(Phone, MessageBody, cancelled.Token));
        Assert.Empty(http.Requests);
    }

    private static TwilioSettings MessagingServiceSettings() => new()
    {
        AccountSid = AccountSid,
        VerifyServiceSid = "VA0000000000000000000000000000000f",
        ApiKeySid = ApiKeySid,
        ApiKeySecret = ApiKeySecret,
        MessagingServiceSid = MessagingServiceSid,
    };

    private static TwilioMessageService Service(FakeTwilioHttp http, TwilioSettings settings) =>
        new(
            Options.Create(settings),
            new FakeHttpClientFactory(http, new Uri("https://api.twilio.com"))
        );
}
