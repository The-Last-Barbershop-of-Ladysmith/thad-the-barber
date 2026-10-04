using Square;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Square.Services;

public sealed class SquareService(SquareClient square) : ISquareService
{
    public async Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        try
        {
            await square.OAuth.RetrieveTokenStatusAsync(cancellationToken: cancellationToken);
            return SquareConnection.Connected;
        }
        catch (Exception exception) when (exception is SquareNotConnectedException or SquareApiException { StatusCode: StatusCodes.Status401Unauthorized })
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
