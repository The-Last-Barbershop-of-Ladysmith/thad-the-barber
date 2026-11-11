namespace ThadTheBarber.Api.Infrastructure.Storage.Models;

/// <summary>A blob in a storage container: its full name ("gallery/skin-fade.jpg") and when it was uploaded.</summary>
public sealed record StoredBlob(
    string Name,
    DateTimeOffset UploadedAt
);
