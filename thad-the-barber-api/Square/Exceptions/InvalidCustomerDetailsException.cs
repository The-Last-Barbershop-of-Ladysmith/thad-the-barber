namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>Square refused the customer's name or phone, so the customer has to correct them.</summary>
public sealed class InvalidCustomerDetailsException(string message, Exception? innerException = null)
    : Exception(message, innerException);
