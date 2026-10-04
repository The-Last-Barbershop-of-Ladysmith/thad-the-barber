using Azure;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Options;
using Square;
using Square.OAuth;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;

namespace ThadTheBarber.Api.Square.Services;

/// <summary>
/// Holds Square's access token in memory only. It renews on first use (each start-up), when the token is older than
/// <see cref="MaxAge"/> (Square's guidance), and after Square rejects it. Square's code flow returns the same refresh
/// token every time, so nothing is ever written back to Key Vault.
/// </summary>
public sealed partial class SquareAccessTokenProvider(
    SecretClient secrets,
    IHttpClientFactory httpClients,
    IOptions<SquareSettings> settings,
    TimeProvider time,
    ILogger<SquareAccessTokenProvider> logger) : IDisposable
{
    public static readonly TimeSpan MaxAge = TimeSpan.FromDays(7);

    private readonly SemaphoreSlim _renewal = new(1, 1);
    private string? _accessToken;
    private DateTimeOffset _obtainedAt;
    private string _nextRenewalReason = "start-up";

    public void Dispose() => _renewal.Dispose();

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (CurrentToken() is string token)
        {
            return token;
        }

        await _renewal.WaitAsync(cancellationToken);
        try
        {
            return CurrentToken() ?? await RenewAsync(cancellationToken);
        }
        finally
        {
            _renewal.Release();
        }
    }

    /// <summary>
    /// Drops <paramref name="rejectedToken"/> after Square answers 401, unless another request already replaced it.
    /// </summary>
    public void Invalidate(string rejectedToken)
    {
        if (Interlocked.CompareExchange(ref _accessToken, null, rejectedToken) == rejectedToken)
        {
            _nextRenewalReason = "rejected";
        }
    }

    private string? CurrentToken()
    {
        string? token = Volatile.Read(ref _accessToken);
        if (token is not null && time.GetUtcNow() - _obtainedAt >= MaxAge)
        {
            _nextRenewalReason = "age";
            return null;
        }

        return token;
    }

    private async Task<string> RenewAsync(CancellationToken cancellationToken)
    {
        SquareClient square = SquareSetup.CreateClient(httpClients, settings.Value);
        ObtainTokenResponse response;
        try
        {
            response = await square.OAuth.ObtainTokenAsync(
                new ObtainTokenRequest
                {
                    ClientId = settings.Value.ApplicationId,
                    ClientSecret = await ReadSecretAsync(SquareSecrets.ApplicationSecret, cancellationToken),
                    GrantType = "refresh_token",
                    RefreshToken = await ReadSecretAsync(SquareSecrets.RefreshToken, cancellationToken),
                },
                cancellationToken: cancellationToken);
        }
        catch (SquareApiException exception) when (exception.StatusCode is StatusCodes.Status400BadRequest or StatusCodes.Status401Unauthorized)
        {
            LogNotConnected(logger, exception.StatusCode);
            throw new SquareNotConnectedException("Square refused the refresh token.", exception);
        }

        _obtainedAt = time.GetUtcNow();
        Volatile.Write(ref _accessToken, response.AccessToken);
        LogRenewed(logger, _nextRenewalReason, response.ExpiresAt);
        return response.AccessToken!;
    }

    private async Task<string> ReadSecretAsync(string name, CancellationToken cancellationToken)
    {
        try
        {
            Response<KeyVaultSecret> secret = await secrets.GetSecretAsync(name, cancellationToken: cancellationToken);
            return secret.Value.Value;
        }
        catch (RequestFailedException exception) when (exception.Status == StatusCodes.Status404NotFound)
        {
            LogSecretMissing(logger, name);
            throw new SquareNotConnectedException($"{name} isn't in Key Vault.", exception);
        }
    }

    [LoggerMessage(EventName = "SquareTokenRenewed", Level = LogLevel.Information, Message = "Square access token renewed ({Reason}); it expires {ExpiresAt}.")]
    private static partial void LogRenewed(ILogger logger, string reason, string? expiresAt);

    [LoggerMessage(EventName = "SquareRefreshTokenRefused", Level = LogLevel.Warning, Message = "Square refused the refresh token (HTTP {StatusCode}). Run tools/square-connect again.")]
    private static partial void LogNotConnected(ILogger logger, int statusCode);

    [LoggerMessage(EventName = "SquareSecretMissing", Level = LogLevel.Warning, Message = "{SecretName} isn't in Key Vault. Run tools/square-connect.")]
    private static partial void LogSecretMissing(ILogger logger, string secretName);
}
