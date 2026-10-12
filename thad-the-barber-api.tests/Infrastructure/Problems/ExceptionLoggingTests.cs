using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Infrastructure.Problems;

/// <summary>.NET 10 stops logging handled exceptions by default; Square failures must still be logged as errors.</summary>
public sealed class ExceptionLoggingTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task SquareFailuresAreLoggedAsErrors()
    {
        FakeLogCollector logs = await RequestAsync(new SquareRequestFailedException(StatusCodes.Status500InternalServerError, []));

        Assert.Contains(logs.GetSnapshot(), record => record.Level == LogLevel.Error && record.Exception is SquareRequestFailedException);
    }

    [Fact]
    public async Task ProblemsAreLoggedAsInformationNotErrors()
    {
        FakeLogCollector logs = await RequestAsync(new SlotUnavailableException("Taken."));

        IReadOnlyList<FakeLogRecord> records = logs.GetSnapshot();
        Assert.Contains(records, record => record.Level == LogLevel.Information && record.Exception is SlotUnavailableException);
        Assert.DoesNotContain(records, record => record.Level >= LogLevel.Error);
    }

    private async Task<FakeLogCollector> RequestAsync(Exception thrown)
    {
        using WebApplicationFactory<Program> throwing = factory.WithFakeLogging().WithFallbackHandler(_ => throw thrown);

        using HttpResponseMessage response = await throwing.CreateClient().GetAsync("/api/throw", TestContext.Current.CancellationToken);

        return throwing.Services.GetFakeLogCollector();
    }
}
