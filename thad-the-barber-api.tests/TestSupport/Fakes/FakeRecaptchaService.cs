using ThadTheBarber.Api.Recaptcha.Models;
using ThadTheBarber.Api.Recaptcha.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// reCAPTCHA for tests: answers every token with <see cref="Assessment"/> (by default a pass for the session action on
/// <see cref="ApiFactory.FrontendOrigin"/>'s host), or throws <see cref="Failure"/>. Records the tokens and origins it's asked about.
/// </summary>
public sealed class FakeRecaptchaService : IRecaptchaService
{
    public static readonly RecaptchaAssessment Pass = new(
        IsValid: true,
        InvalidReason: null,
        Action: "session",
        Hostname: "app.example.com",
        Score: 0.9
    );

    public RecaptchaAssessment Assessment { get; set; } = Pass;

    public Exception? Failure { get; set; }

    public List<string> Tokens { get; } = [];

    public List<string> Origins { get; } = [];

    public Task<RecaptchaAssessment> AssessAsync(string token, string expectedAction, string origin, CancellationToken cancellationToken)
    {
        Tokens.Add(token);
        Origins.Add(origin);
        if (Failure is not null)
        {
            throw Failure;
        }

        return Task.FromResult(Assessment);
    }
}
