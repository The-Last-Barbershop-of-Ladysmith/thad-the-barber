namespace ThadTheBarber.Api.Square.Handlers;

/// <summary>
/// Sends the token request without the SDK's placeholder bearer token: renewing is the one call made before a real
/// access token exists.
/// </summary>
public sealed class NoAuthorizationHandler : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.Authorization = null;
        return base.SendAsync(request, cancellationToken);
    }
}
