using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace ThadTheBarber.Api.Tests.TestSupport;

public static class FallbackHandlerExtensions
{
    /// <summary>
    /// This host with <paramref name="handler"/> run at the end of the app's pipeline, for requests no endpoint matched,
    /// so the exceptions it throws go through the app's exception handlers.
    /// </summary>
    public static WebApplicationFactory<Program> WithFallbackHandler(this WebApplicationFactory<Program> host, RequestDelegate handler) =>
        host.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton<IStartupFilter>(new FallbackHandlerFilter(handler))));

    private sealed class FallbackHandlerFilter(RequestDelegate handler) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.Run(handler);
        };
    }
}
