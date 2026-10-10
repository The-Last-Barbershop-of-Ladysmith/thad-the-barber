using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Session.Configuration;

public sealed class SessionSettings
{
    public const string SectionName = "Session";

    /// <summary>The EC P-256 key in the environment's Key Vault that signs session tokens (Bicep creates it).</summary>
    [Required]
    public string SigningKeyName { get; set; } = null!;

    public TimeSpan Lifetime { get; set; } = TimeSpan.FromMinutes(15);
}
