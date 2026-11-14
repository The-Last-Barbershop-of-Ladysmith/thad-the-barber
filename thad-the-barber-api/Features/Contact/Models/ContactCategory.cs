namespace ThadTheBarber.Api.Features.Contact.Models;

/// <summary>What the visitor is writing about. A question or an issue needs an answer or a fix, so it alerts the shop.</summary>
public enum ContactCategory
{
    Question,
    Issue,
    Feedback,
}
