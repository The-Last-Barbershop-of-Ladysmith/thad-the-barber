namespace ThadTheBarber.Api.Square;

/// <summary>The refresh token is missing or Square refused it: run tools/square-connect again.</summary>
public sealed class SquareNotConnectedException(string message, Exception? innerException = null)
    : Exception(message, innerException);
