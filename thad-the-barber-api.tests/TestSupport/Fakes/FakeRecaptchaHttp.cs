using System.Net;
using System.Text;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Google's reCAPTCHA API for tests: records the one request it gets and answers with <see cref="Status"/> and <see cref="Body"/>.</summary>
public sealed class FakeRecaptchaHttp : HttpMessageHandler
{
    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

    public string Body { get; set; } = """{"tokenProperties":{"valid":true,"hostname":"app.example.com","action":"session"},"riskAnalysis":{"score":0.9}}""";

    public HttpRequestMessage? Request { get; private set; }

    public string? RequestBody { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Request = request;
        RequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        return new HttpResponseMessage(Status) { Content = new StringContent(Body, Encoding.UTF8, "application/json") };
    }
}
