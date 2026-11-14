using System.Net;
using System.Text;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed class FakeTwilioHttp : HttpMessageHandler
{
    public List<RecordedRequest> Requests { get; } = [];

    public HttpStatusCode Status { get; set; } = HttpStatusCode.Created;

    public string Body { get; set; } = """{"sid":"VEmadeup","status":"pending"}""";

    public bool IsDown { get; set; }

    public bool IsTimingOut { get; set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (IsDown)
        {
            throw new HttpRequestException("Twilio is down.");
        }

        if (IsTimingOut)
        {
            throw new TaskCanceledException("Twilio timed out.");
        }

        string requestBody = string.Empty;
        if (request.Content is not null)
        {
            requestBody = await request.Content.ReadAsStringAsync(cancellationToken);
        }

        Requests.Add(new RecordedRequest(
            request.RequestUri!.AbsolutePath,
            request.RequestUri.Query,
            request.Headers.Authorization?.Parameter,
            requestBody
        ));
        return new HttpResponseMessage(Status)
        {
            Content = new StringContent(Body, Encoding.UTF8, "application/json"),
        };
    }
}
