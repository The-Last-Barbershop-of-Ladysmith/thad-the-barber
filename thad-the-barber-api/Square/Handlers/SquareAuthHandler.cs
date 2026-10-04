using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Square.Handlers;

/// <summary>
/// Puts the current access token on every Square request, and on a 401 renews it and retries once.
/// </summary>
public sealed class SquareAuthHandler(SquareAccessTokenProvider tokens) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
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
        request.Headers.Authorization = new AuthenticationHeaderValue(JwtBearerDefaults.AuthenticationScheme, token);
        return base.SendAsync(request, cancellationToken);
    }
}
