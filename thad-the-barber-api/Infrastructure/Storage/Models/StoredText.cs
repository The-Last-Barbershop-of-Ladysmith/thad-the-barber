namespace ThadTheBarber.Api.Infrastructure.Storage.Models;

/// <summary>A text blob read with the ETag it had, so a later write can say "only if it is still this version".</summary>
public sealed record StoredText(
    string Text,
    string ETag
);
