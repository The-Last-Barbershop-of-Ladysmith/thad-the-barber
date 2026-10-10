using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Recaptcha.Configuration;

public sealed class RecaptchaSettings
{
    public const string SectionName = "Recaptcha";

    /// <summary>The Google Cloud project that owns the reCAPTCHA key.</summary>
    [Required]
    public string ProjectId { get; set; } = null!;

    /// <summary>The key the frontend's tokens are made with (not secret; the UI has it as <c>recaptchaSiteKey</c>).</summary>
    [Required]
    public string SiteKey { get; set; } = null!;

    /// <summary>The API key for <c>createAssessment</c>, from the <c>Recaptcha--ApiKey</c> Key Vault secret.</summary>
    [Required]
    public string ApiKey { get; set; } = null!;

    /// <summary>The lowest score that gets a session (BR-24), from 0 (likely a bot) to 1 (likely a person).</summary>
    [Range(0.0, 1.0)]
    public double MinScore { get; set; } = 0.5;
}
