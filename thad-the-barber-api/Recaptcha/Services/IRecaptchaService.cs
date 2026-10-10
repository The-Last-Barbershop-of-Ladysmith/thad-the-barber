using ThadTheBarber.Api.Recaptcha.Models;

namespace ThadTheBarber.Api.Recaptcha.Services;

public interface IRecaptchaService
{
    /// <summary>Asks Google to assess a token made on the site for <paramref name="expectedAction"/>.</summary>
    /// <exception cref="HttpRequestException">Google couldn't be reached or refused the request.</exception>
    Task<RecaptchaAssessment> AssessAsync(string token, string expectedAction, CancellationToken cancellationToken);
}
