using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Mvc.Testing;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Problems.Configuration;

public sealed class ProblemsSetupTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ValidationFailureIsValidationFailed()
    {
        using HttpResponseMessage response = await factory.CreateClient().PostAsJsonAsync(
            "/api/bookings",
            new
            {
                startAt = "2031-02-03T15:00:00Z",
                name = "Q",
                phone = "12",
                idempotencyKey = Guid.NewGuid(),
            },
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
    }

    [Fact]
    public async Task EndpointValidationProblemIsValidationFailed()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/bookings/availability?month=13-2031", Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
    }

    [Fact]
    public async Task MalformedJsonIsBadRequest()
    {
        using StringContent malformed = new("{\"startAt\":", Encoding.UTF8, "application/json");

        using HttpResponseMessage response = await factory.CreateClient().PostAsync("/api/bookings", malformed, Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "bad_request");
    }

    [Fact]
    public async Task MissingTokenIsUnauthorized()
    {
        using HttpResponseMessage response = await factory.CreateClientWithoutToken().GetAsync("/api/bookings/availability?month=2031-02", Cancellation);

        await ProblemAssert.IsProblemAsync(response, 401, "unauthorized");
    }

    [Fact]
    public async Task UnknownRouteIsNotFound()
    {
        using HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/nope", Cancellation);

        await ProblemAssert.IsProblemAsync(response, 404, "not_found");
    }

    [Fact]
    public async Task WrongMethodIsMethodNotAllowed()
    {
        using HttpResponseMessage response = await factory.CreateClient().DeleteAsync("/api/shop", Cancellation);

        await ProblemAssert.IsProblemAsync(response, 405, "method_not_allowed");
    }

    [Fact]
    public async Task UnhandledErrorIsInternalErrorWithoutAStackTrace()
    {
        using WebApplicationFactory<Program> throwing = factory.WithFallbackHandler(_ => throw new InvalidOperationException("thrown by a test"));

        using HttpResponseMessage response = await throwing.CreateClient().GetAsync("/api/throw", Cancellation);

        await ProblemAssert.IsProblemAsync(response, 500, "internal_error");
        string body = await response.Content.ReadAsStringAsync(Cancellation);
        Assert.DoesNotContain("thrown by a test", body, StringComparison.Ordinal);
        Assert.DoesNotContain(nameof(ProblemsSetupTests), body, StringComparison.Ordinal);
    }
}
