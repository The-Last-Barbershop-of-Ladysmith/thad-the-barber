using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Square.Exceptions;

/// <summary>Square refused the customer's name or phone, so the customer has to correct them.</summary>
public sealed class InvalidCustomerDetailsException(string message, Exception? innerException = null)
    : ProblemException(
        StatusCodes.Status400BadRequest,
        "invalid_customer_details",
        "Square couldn't accept the name or phone.",
        message,
        innerException
    );
