using System.Text.Json;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Recaptcha.Configuration;
using ThadTheBarber.Api.Recaptcha.Exceptions;
using ThadTheBarber.Api.Recaptcha.Mappers;
using ThadTheBarber.Api.Recaptcha.Models;

namespace ThadTheBarber.Api.Recaptcha.Services;

/// <summary>
/// Google's reCAPTCHA <c>createAssessment</c> REST call. The API key goes in a header rather than the <c>?key=</c>
/// query string, so it never shows up in logged or traced URLs.
/// </summary>
public sealed class RecaptchaService(HttpClient http, IOptions<RecaptchaSettings> settings) : IRecaptchaService
{
    private const string ApiKeyHeader = "X-Goog-Api-Key";

    public async Task<RecaptchaAssessment> AssessAsync(string token, string expectedAction, CancellationToken cancellationToken)
    {
        try
        {
            return await RequestAssessmentAsync(token, expectedAction, cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or JsonException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            throw new RecaptchaUnavailableException("reCAPTCHA couldn't assess the token.", exception);
        }
    }

    private async Task<RecaptchaAssessment> RequestAssessmentAsync(string token, string expectedAction, CancellationToken cancellationToken)
    {
        RecaptchaSettings recaptcha = settings.Value;
        using HttpRequestMessage request = new(HttpMethod.Post, $"v1/projects/{Uri.EscapeDataString(recaptcha.ProjectId)}/assessments")
        {
            Content = JsonContent.Create(new
            {
                @event = new
                {
                    token,
                    siteKey = recaptcha.SiteKey,
                    expectedAction,
                },
            }),
        };
        request.Headers.Add(ApiKeyHeader, recaptcha.ApiKey);

        using HttpResponseMessage response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        AssessmentResponse assessment = await response.Content.ReadFromJsonAsync<AssessmentResponse>(cancellationToken)
            ?? throw new JsonException("reCAPTCHA answered with an empty body.");
        return assessment.ToAssessment();
    }
}
