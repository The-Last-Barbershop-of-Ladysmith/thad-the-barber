namespace ThadTheBarber.Api.Infrastructure.Storage.Models;

/// <summary>Marks an endpoint that takes a photo upload, so the request body limit can be raised for it alone.</summary>
public sealed record ImageUploadMetadata;
