using System.Net;
using System.Net.Http.Headers;

namespace ThadTheBarber.Api.Square.OAuth;

/// <summary>
/// Puts the current access token on every Square request, and on a 401 renews it and retries once. The token request
/// itself goes out without one.
/// </summary>
public sealed class SquareAuthHandler(SquareAccessTokenProvider tokens) : DelegatingHandler
{
    private const string ObtainTokenPath = "/oauth2/token";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.RequestUri?.AbsolutePath == ObtainTokenPath)
        {
            request.Headers.Authorization = null;
            return await base.SendAsync(request, cancellationToken);
        }

        string token = await tokens.GetAccessTokenAsync(cancellationToken);
        HttpResponseMessage response = await SendWithTokenAsync(request, token, cancellationToken);
        if (response.StatusCode != HttpStatusCode.Unauthorized)
        {
            return response;
        }

        response.Dispose();
        tokens.Invalidate(token);
        return await SendWithTokenAsync(request, await tokens.GetAccessTokenAsync(cancellationToken), cancellationToken);
    }

    private Task<HttpResponseMessage> SendWithTokenAsync(HttpRequestMessage request, string token, CancellationToken cancellationToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return base.SendAsync(request, cancellationToken);
    }
}
