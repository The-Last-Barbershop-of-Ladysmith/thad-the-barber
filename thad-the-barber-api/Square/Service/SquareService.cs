using Square;
using ThadTheBarber.Api.Square.OAuth;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Service;

public sealed class SquareService(SquareClient square) : ISquareService
{
    public async Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        try
        {
            await square.OAuth.RetrieveTokenStatusAsync(cancellationToken: cancellationToken);
            return SquareConnection.Connected;
        }
        catch (SquareNotConnectedException)
        {
            return SquareConnection.NotConnected;
        }
        catch (SquareApiException exception) when (exception.StatusCode == StatusCodes.Status401Unauthorized)
        {
            return SquareConnection.NotConnected;
        }
        catch (Exception exception) when (exception is SquareException or HttpRequestException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return SquareConnection.Unreachable;
        }
    }
}
