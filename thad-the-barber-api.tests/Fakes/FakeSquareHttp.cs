using System.Net;
using System.Text;

namespace ThadTheBarber.Api.Tests.Fakes;

/// <summary>
/// Square's HTTP API for tests. Token requests issue <c>access-1</c>, <c>access-2</c>, …; other requests answer 200
/// (or their path's <see cref="ResponseStatuses"/>) with their path's body from <see cref="Responses"/> unless their bearer token is in <see cref="RejectedTokens"/>.
/// Every request is recorded; <see cref="Down"/> makes them all fail.
/// </summary>
public sealed class FakeSquareHttp : HttpMessageHandler
{
    public List<RecordedRequest> Requests { get; } = [];

    public HashSet<string> RejectedTokens { get; } = [];

    /// <summary>Response bodies by request path, e.g. <c>/v2/locations/main</c>.</summary>
    public Dictionary<string, string> Responses { get; } = [];

    /// <summary>Statuses other than 200 by request path, answered with the path's body from <see cref="Responses"/>.</summary>
    public Dictionary<string, HttpStatusCode> ResponseStatuses { get; } = [];

    public HttpStatusCode TokenStatus { get; set; } = HttpStatusCode.OK;

    public int TokensIssued { get; private set; }

    public bool Down { get; set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Down)
        {
            throw new HttpRequestException("Square is down.");
        }

        string body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
        RecordedRequest recorded = new(
            request.RequestUri!.AbsolutePath,
            request.Headers.Authorization?.Parameter,
            body
        );
        lock (Requests)
        {
            Requests.Add(recorded);
        }

        if (recorded.Path == "/oauth2/token")
        {
            if (TokenStatus != HttpStatusCode.OK)
            {
                return Json(TokenStatus, """{"errors":[{"category":"AUTHENTICATION_ERROR","code":"UNAUTHORIZED"}]}""");
            }

            TokensIssued++;
            return Json(HttpStatusCode.OK, $$"""{"access_token":"access-{{TokensIssued}}","expires_at":"2026-11-03T00:00:00Z","refresh_token":"same"}""");
        }

        if (recorded.Token is { } token && RejectedTokens.Contains(token))
        {
            return Json(HttpStatusCode.Unauthorized, """{"errors":[{"category":"AUTHENTICATION_ERROR","code":"UNAUTHORIZED"}]}""");
        }

        return Json(ResponseStatuses.GetValueOrDefault(recorded.Path, HttpStatusCode.OK), Responses.GetValueOrDefault(recorded.Path, """{"merchant_id":"M1","expires_at":"2026-11-03T00:00:00Z"}"""));
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
}
