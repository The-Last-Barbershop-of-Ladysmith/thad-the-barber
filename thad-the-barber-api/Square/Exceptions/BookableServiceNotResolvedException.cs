namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>The Square catalog doesn't name the shop's one bookable service: fix it in the Dashboard or pin it.</summary>
public sealed class BookableServiceNotResolvedException(string message)
    : Exception(message);
