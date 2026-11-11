using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Infrastructure.Storage.Configuration;

/// <summary>
/// The environment's storage account and its two containers, by short name (the URIs are built in code). Set per
/// environment in <c>appsettings.{Environment}.json</c>.
/// </summary>
public sealed class MediaStorageSettings
{
    public const string SectionName = "MediaStorage";

    [Required]
    public string AccountName { get; set; } = null!;

    /// <summary>The image files, readable by exact URL but not listable: <c>gallery/</c> and <c>announcements/</c>.</summary>
    [Required]
    public string MediaContainerName { get; set; } = null!;

    /// <summary>The private container that holds <c>announcements.json</c>, so scheduled and expired posts stay hidden.</summary>
    [Required]
    public string ContentContainerName { get; set; } = null!;

    public string BlobServiceUrl => $"https://{AccountName}.blob.core.windows.net/";

    /// <summary>Where a file in the media container is served from; the browser loads photos straight from storage.</summary>
    public string GetMediaUrl(string blobName) => $"{BlobServiceUrl}{MediaContainerName}/{blobName}";
}
