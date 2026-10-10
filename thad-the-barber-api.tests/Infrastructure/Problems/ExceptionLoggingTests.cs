using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Logging;
using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Problems;

/// <summary>.NET 10 stops logging handled exceptions by default; Square failures must still be logged as errors.</summary>
public sealed class ExceptionLoggingTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task SquareFailuresAreLoggedAsErrors()
    {
        FakeLogCollector logs = await RequestAsync("/api/square-down");

        Assert.Contains(logs.GetSnapshot(), record => record.Level == LogLevel.Error && record.Exception is SquareApiException);
    }

    [Fact]
    public async Task ProblemsAreLoggedAsInformationNotErrors()
    {
        FakeLogCollector logs = await RequestAsync("/api/slot-taken");

        IReadOnlyList<FakeLogRecord> records = logs.GetSnapshot();
        Assert.Contains(records, record => record.Level == LogLevel.Information && record.Exception is SlotUnavailableException);
        Assert.DoesNotContain(records, record => record.Level >= LogLevel.Error);
    }

    private async Task<FakeLogCollector> RequestAsync(string path)
    {
        using WebApplicationFactory<Program> throwing = factory.WithFakeLogging().WithWebHostBuilder(builder => builder.ConfigureServices(
            services => services.AddSingleton<IStartupFilter, ThrowingFilter>()));

        using HttpResponseMessage response = await throwing.CreateClient().GetAsync(path, TestContext.Current.CancellationToken);

        return throwing.Services.GetFakeLogCollector();
    }

    /// <summary>Adds a terminal middleware after the app's pipeline, so its exceptions reach the exception handlers.</summary>
    private sealed class ThrowingFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Run(context =>
            {
                if (context.Request.Path == "/api/square-down")
                {
                    throw new SquareApiException("Square is down", StatusCodes.Status500InternalServerError, """{"errors":[]}""");
                }

                throw new SlotUnavailableException("Taken.");
            });
        };
    }
}
