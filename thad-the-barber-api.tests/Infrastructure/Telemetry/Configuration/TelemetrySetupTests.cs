using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Time.Testing;
using OpenTelemetry.Logs;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Infrastructure.Telemetry.Configuration;

/// <summary>
/// BR-23: a booking's name and phone never reach App Insights (Square's error bodies are kept out at the Square boundary,
/// see <c>SquareServiceRequestTests</c>). The ASP.NET Core activity source is process-wide, so captured spans include
/// other tests' requests; assertions look for this test's values only.
/// </summary>
public sealed partial class TelemetrySetupTests
{
    private const string Now = "2026-10-06T15:10:00Z";
    private const string GivenName = "Quillon";
    private const string FamilyName = "Vey-Ashgrove";
    private const string Phone = "+15550100163";
    private const string PhoneDigits = "5550100163";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task BookingLeavesNoNameOrPhoneInTelemetry()
    {
        TelemetryCapture capture = new();

        using HttpResponseMessage response = await BookAsync(capture, new FakeSquareService { CustomerId = null });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        AssertNoCustomerData(capture);
    }

    /// <summary>
    /// What the processors' own tests can't show: the app registers them ahead of export. A booking logs no customer data
    /// today, so this logs and tags some through the host's pipeline itself.
    /// </summary>
    [Fact]
    public async Task CustomerDataLoggedOrTaggedInTheAppIsRedactedBeforeExport()
    {
        TelemetryCapture capture = new();
        using ApiFactory api = new();
        using WebApplicationFactory<Program> host = capture.Attach(api);
        ILogger logger = host.Services.GetRequiredService<ILogger<TelemetrySetupTests>>();
        using ActivitySource requestSource = new("Microsoft.AspNetCore");

        LogBooked(logger, $"{GivenName} {FamilyName}", Phone);
        Activity span = requestSource.StartActivity("Booking", ActivityKind.Server)
            ?? throw new InvalidOperationException("The host's tracer isn't listening.");
        span.SetTag("customer.phone", Phone);
        span.SetTag("note", $"Call {Phone} back");
        span.Dispose();
        await capture.WaitForSpanAsync(ended => ended.TraceId == span.TraceId, Cancellation);

        AssertNoCustomerData(capture);
    }

    [Fact]
    public void WithAppInsightsOnlyOpenTelemetryWritesLogs()
    {
        using ApiFactory api = new();
        using WebApplicationFactory<Program> inAzure = api.WithWebHostBuilder(builder => builder.UseSetting(
            "APPLICATIONINSIGHTS_CONNECTION_STRING",
            "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=http://127.0.0.1:9/"));

        ILoggerProvider provider = Assert.Single(inAzure.Services.GetServices<ILoggerProvider>());

        Assert.IsType<OpenTelemetryLoggerProvider>(provider);
    }

    [Fact]
    public void LocallyTheConsoleStillWritesLogs()
    {
        using ApiFactory api = new();

        Assert.Contains(api.Services.GetServices<ILoggerProvider>(), provider => provider is ConsoleLoggerProvider);
    }

    [Fact]
    public async Task IncomingTraceparentBecomesTheRequestsTrace()
    {
        TelemetryCapture capture = new();
        using ApiFactory api = new();
        using WebApplicationFactory<Program> host = capture.Attach(api);
        using HttpRequestMessage request = new(HttpMethod.Get, "/api/health");
        request.Headers.Add("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

        using HttpResponseMessage response = await host.CreateClient().SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Activity span = await capture.WaitForSpanAsync(span => span.TraceId.ToHexString() == "4bf92f3577b34da6a3ce929d0e0e4736", Cancellation);
        Assert.Equal(ActivityKind.Server, span.Kind);
        Assert.Equal("00f067aa0ba902b7", span.ParentSpanId.ToHexString());
    }

    private static async Task<HttpResponseMessage> BookAsync(TelemetryCapture capture, FakeSquareService square)
    {
        using ApiFactory api = new(
            square: square,
            time: new FakeTimeProvider(DateTimeOffset.Parse(Now, CultureInfo.InvariantCulture))
        );
        WebApplicationFactory<Program> host = capture.Attach(api);
        ActivityTraceId traceId = ActivityTraceId.CreateRandom();
        using HttpRequestMessage request = new(HttpMethod.Post, "/api/bookings")
        {
            Content = JsonContent.Create(new
            {
                startAt = "2026-10-07T13:30:00Z",
                name = $"{GivenName} {FamilyName}",
                phone = Phone,
                idempotencyKey = Guid.NewGuid(),
            }),
        };
        request.Headers.Add("traceparent", $"00-{traceId.ToHexString()}-{ActivitySpanId.CreateRandom().ToHexString()}-01");
        HttpResponseMessage response = await host.CreateClient().SendAsync(request, Cancellation);
        // The span is process-wide, so the wait is for this request's trace, not another test's booking.
        await capture.WaitForSpanAsync(span => span.TraceId == traceId && span.Kind == ActivityKind.Server, Cancellation);
        await host.DisposeAsync();
        return response;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Booked {Name} on {Phone}.")]
    private static partial void LogBooked(ILogger logger, string name, string phone);

    private static void AssertNoCustomerData(TelemetryCapture capture)
    {
        Assert.DoesNotContain(capture.Texts, text => text.Contains(PhoneDigits, StringComparison.Ordinal));
        Assert.DoesNotContain(capture.Texts, text => text.Contains(GivenName, StringComparison.Ordinal));
        Assert.DoesNotContain(capture.Texts, text => text.Contains(FamilyName, StringComparison.Ordinal));
    }
}
