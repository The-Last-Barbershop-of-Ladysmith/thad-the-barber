using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Square;

public sealed class SquareSettings
{
    public const string SectionName = "Square";

    /// <summary>Square's API host: production or sandbox.</summary>
    [Required]
    public Uri BaseUrl { get; set; } = null!;
}
