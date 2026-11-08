using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Reviews.Configuration;

/// <summary>
/// Where the owner's <c>content/reviews.json</c> lives: the environment's public media container, named here rather
/// than as a URL (the same account and container the UI lists the gallery from).
/// </summary>
public sealed class ReviewsSettings
{
    public const string SectionName = "Reviews";

    [Required]
    public string MediaAccountName { get; set; } = null!;

    [Required]
    public string MediaContainerName { get; set; } = null!;

    /// <summary>
    /// How long the file's content is kept and shared by every visitor, which is also how long an edit in the Azure
    /// portal takes to show. A failed read is kept for this long too, so a missing file isn't requested on every visit.
    /// </summary>
    [Range(typeof(TimeSpan), "00:00:01", "01:00:00")]
    public TimeSpan CacheFor { get; set; }
}
