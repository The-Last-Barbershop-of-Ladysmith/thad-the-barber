using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Contact.Exceptions;

/// <summary>The message couldn't be saved, so the visitor is told to try again or call or text the shop.</summary>
public sealed class ContactUnavailableException(Exception innerException)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "contact_unavailable",
        "We couldn't send your message.",
        "The contact message couldn't be saved.",
        innerException
    );
