namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>The time was booked elsewhere after the customer picked it.</summary>
public sealed class SlotUnavailableException(string message, Exception? innerException = null)
    : Exception(message, innerException);
