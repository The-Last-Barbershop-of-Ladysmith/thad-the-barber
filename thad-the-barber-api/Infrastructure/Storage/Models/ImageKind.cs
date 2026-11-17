namespace ThadTheBarber.Api.Infrastructure.Storage.Models;

/// <summary>An image format the site accepts: the extension the file is stored with and the content type it is served as.</summary>
public sealed record ImageKind(
    string Extension,
    string ContentType
);
