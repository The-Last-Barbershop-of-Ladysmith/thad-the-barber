using ThadTheBarber.Api.Recaptcha.Models;

namespace ThadTheBarber.Api.Recaptcha.Mappers;

public static class AssessmentMapper
{
    /// <summary>A response without token properties counts as an invalid token, and one without a score as 0.</summary>
    public static RecaptchaAssessment ToAssessment(this AssessmentResponse response) =>
        new(
            IsValid: response.TokenProperties?.Valid ?? false,
            InvalidReason: response.TokenProperties?.InvalidReason,
            Action: response.TokenProperties?.Action,
            Hostname: response.TokenProperties?.Hostname,
            Score: response.RiskAnalysis?.Score ?? 0
        );
}
