namespace ThadTheBarber.Api.Features.Media.Models;

/// <summary>What Event Grid expects back to accept a new subscription: the code it sent.</summary>
public sealed record EventGridValidationResponse(
    string ValidationResponse
);
