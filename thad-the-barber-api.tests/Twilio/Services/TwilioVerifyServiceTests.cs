using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Configuration;
using ThadTheBarber.Api.Twilio.Exceptions;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.Twilio.Services;

public sealed class TwilioVerifyServiceTests
{
    private const string Phone = "+15555550123";
    private const string Code = "482913";
    private const string AccountSid = "AC0000000000000000000000000000000f";
    private const string VerifyServiceSid = "VA0000000000000000000000000000000f";
    private const string ApiKeySid = "SK0000000000000000000000000000000f";
    private const string ApiKeySecret = "made-up-secret";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task StartAsksTheVerifyServiceToTextTheCode()
    {
        FakeTwilioHttp http = new();

        await Service(http).StartAsync(Phone, Cancellation);

        RecordedRequest request = Assert.Single(http.Requests);
        Assert.Equal($"/v2/Services/{VerifyServiceSid}/Verifications", request.Path);
        Assert.Contains("To=%2B15555550123", request.Body, StringComparison.Ordinal);
        Assert.Contains("Channel=sms", request.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RequestsAreSignedWithTheApiKey()
    {
        FakeTwilioHttp http = new();

        await Service(http).StartAsync(Phone, Cancellation);

        string expected = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKeySid}:{ApiKeySecret}"));
        Assert.Equal(expected, Assert.Single(http.Requests).Token);
    }

    [Fact]
    public async Task AnApprovedCheckIsTrue()
    {
        FakeTwilioHttp http = new()
        {
            Status = HttpStatusCode.OK,
            Body = """{"sid":"VEmadeup","status":"approved"}""",
        };

        bool isCodeRight = await Service(http).CheckAsync(Phone, Code, Cancellation);

        Assert.True(isCodeRight);
        RecordedRequest request = Assert.Single(http.Requests);
        Assert.Equal($"/v2/Services/{VerifyServiceSid}/VerificationCheck", request.Path);
        Assert.Contains($"Code={Code}", request.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task APendingCheckIsFalse()
    {
        FakeTwilioHttp http = new()
        {
            Status = HttpStatusCode.OK,
            Body = """{"sid":"VEmadeup","status":"pending"}""",
        };

        Assert.False(await Service(http).CheckAsync(Phone, Code, Cancellation));
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound, 20404)]
    [InlineData(HttpStatusCode.TooManyRequests, 60202)]
    public async Task ACheckTwilioRefusesAsGoneOrOverusedIsFalse(HttpStatusCode status, int twilioErrorCode)
    {
        FakeTwilioHttp http = new()
        {
            Status = status,
            Body = ErrorBody(status, twilioErrorCode),
        };

        Assert.False(await Service(http).CheckAsync(Phone, Code, Cancellation));
    }

    [Fact]
    public async Task OtherCheckFailuresKeepOnlyTheStatusAndCode()
    {
        FakeTwilioHttp http = new()
        {
            Status = HttpStatusCode.BadRequest,
            Body = ErrorBody(HttpStatusCode.BadRequest, 60200),
        };

        TwilioRequestFailedException failure = await Assert.ThrowsAsync<TwilioRequestFailedException>(() => Service(http).CheckAsync(Phone, Code, Cancellation));

        Assert.Equal(StatusCodes.Status400BadRequest, failure.StatusCode);
        Assert.DoesNotContain(Phone, failure.Message, StringComparison.Ordinal);
        Assert.Null(failure.InnerException);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, 60203)]
    [InlineData(HttpStatusCode.InternalServerError, 20500)]
    [InlineData(HttpStatusCode.BadRequest, 60205)]
    public async Task AStartTwilioRefusesIsAFailureWithoutThePhone(HttpStatusCode status, int twilioErrorCode)
    {
        FakeTwilioHttp http = new()
        {
            Status = status,
            Body = ErrorBody(status, twilioErrorCode),
        };

        TwilioRequestFailedException failure = await Assert.ThrowsAsync<TwilioRequestFailedException>(() => Service(http).StartAsync(Phone, Cancellation));

        Assert.Equal((int)status, failure.StatusCode);
        Assert.DoesNotContain(Phone, failure.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ALostConnectionIsAFailureForBothCalls()
    {
        FakeTwilioHttp http = new()
        {
            IsDown = true,
        };
        TwilioVerifyService service = Service(http);

        await Assert.ThrowsAsync<TwilioRequestFailedException>(() => service.StartAsync(Phone, Cancellation));
        await Assert.ThrowsAsync<TwilioRequestFailedException>(() => service.CheckAsync(Phone, Code, Cancellation));
    }

    [Fact]
    public async Task WithoutSettingsNothingIsSentAndTheServiceIsNotConfigured()
    {
        FakeTwilioHttp http = new();
        TwilioVerifyService service = new(Options.Create(new TwilioSettings()), new FakeHttpClientFactory(http, new Uri("https://verify.twilio.com")));

        await Assert.ThrowsAsync<TwilioNotConfiguredException>(() => service.StartAsync(Phone, Cancellation));
        await Assert.ThrowsAsync<TwilioNotConfiguredException>(() => service.CheckAsync(Phone, Code, Cancellation));
        Assert.Empty(http.Requests);
    }

    private static TwilioVerifyService Service(FakeTwilioHttp http) =>
        new(
            Options.Create(new TwilioSettings
            {
                AccountSid = AccountSid,
                VerifyServiceSid = VerifyServiceSid,
                ApiKeySid = ApiKeySid,
                ApiKeySecret = ApiKeySecret,
            }),
            new FakeHttpClientFactory(http, new Uri("https://verify.twilio.com"))
        );

    private static string ErrorBody(HttpStatusCode status, int twilioErrorCode) =>
        $$"""{"code":{{twilioErrorCode}},"message":"A made-up error that mentions {{Phone}}.","status":{{(int)status}}}""";
}
