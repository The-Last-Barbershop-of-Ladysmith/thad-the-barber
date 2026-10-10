using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>An <c>HttpContext</c> with ProblemDetails registered, for calling exception handlers directly.</summary>
public static class ExceptionHandlerHarness
{
    public static DefaultHttpContext NewContext()
    {
        ServiceCollection services = new();
        services.AddLogging();
        services.AddProblemDetails();
        return new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider(),
            Response = { Body = new MemoryStream() },
        };
    }

    public static async Task<JsonElement> ReadBodyAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body, cancellationToken: TestContext.Current.CancellationToken);
    }
}
