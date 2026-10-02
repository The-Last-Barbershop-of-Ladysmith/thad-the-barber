namespace ThadTheBarber.Api.Square;

public sealed class SquareService(HttpClient http) : ISquareService
{
    /// <summary>Any HTTP response from Square's host counts as reachable; no credentials are sent.</summary>
    public async Task<bool> IsReachableAsync(CancellationToken cancellationToken)
    {
        try
        {
            using HttpResponseMessage response = await http.GetAsync(
                http.BaseAddress,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            return true;
        }
        catch (HttpRequestException)
        {
            return false;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // HttpClient.Timeout elapsed.
            return false;
        }
    }
}
