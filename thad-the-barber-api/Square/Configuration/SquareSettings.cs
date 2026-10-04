using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Square.Configuration;

public sealed class SquareSettings
{
    public const string SectionName = "Square";

    /// <summary>Square's API host: production or sandbox.</summary>
    [Required]
    public Uri BaseUrl { get; set; } = null!;

    /// <summary>The Square application's ID (not secret). Its secret is in Key Vault (<see cref="SquareSecrets"/>).</summary>
    [Required]
    public string ApplicationId { get; set; } = null!;
}
