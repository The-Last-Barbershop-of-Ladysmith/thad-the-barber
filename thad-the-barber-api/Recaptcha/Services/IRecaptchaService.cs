using ThadTheBarber.Api.Recaptcha.Exceptions;
using ThadTheBarber.Api.Recaptcha.Models;

namespace ThadTheBarber.Api.Recaptcha.Services;

public interface IRecaptchaService
{
    /// <summary>
    /// Asks Google to assess a token made on the site for <paramref name="expectedAction"/>. <paramref name="origin"/>
    /// goes out as the <c>Referer</c>, which is what a website-restricted API key is checked against.
    /// </summary>
    /// <exception cref="RecaptchaUnavailableException">Google couldn't assess it.</exception>
    Task<RecaptchaAssessment> AssessAsync(string token, string expectedAction, string origin, CancellationToken cancellationToken);
}
