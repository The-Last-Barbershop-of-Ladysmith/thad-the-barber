using ThadTheBarber.Api.Recaptcha.Mappers;
using ThadTheBarber.Api.Recaptcha.Models;

namespace ThadTheBarber.Api.Tests.Recaptcha.Mappers;

public sealed class AssessmentMapperTests
{
    [Fact]
    public void ToAssessmentCopiesTheTokenPropertiesAndScore()
    {
        AssessmentResponse response = new(
            new TokenProperties(
                Valid: true,
                InvalidReason: null,
                Hostname: "app.example.com",
                Action: "session"
            ),
            new RiskAnalysis(0.7)
        );

        Assert.Equal(new RecaptchaAssessment(
            IsValid: true,
            InvalidReason: null,
            Action: "session",
            Hostname: "app.example.com",
            Score: 0.7
        ), response.ToAssessment());
    }

    [Fact]
    public void ToAssessmentTreatsAMissingVerdictAsAnInvalidTokenScoringZero()
    {
        AssessmentResponse response = new(
            TokenProperties: null,
            RiskAnalysis: null
        );

        Assert.Equal(new RecaptchaAssessment(
            IsValid: false,
            InvalidReason: null,
            Action: null,
            Hostname: null,
            Score: 0
        ), response.ToAssessment());
    }
}
