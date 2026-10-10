namespace ThadTheBarber.Api.Recaptcha.Models;

/// <summary>The part of Google's <c>createAssessment</c> response the API reads.</summary>
public sealed record AssessmentResponse(
    TokenProperties? TokenProperties,
    RiskAnalysis? RiskAnalysis
);
