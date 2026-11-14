using System.Net;
using System.Text;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed class FakeTwilioHttp : HttpMessageHandler
{
    public List<RecordedRequest> Requests { get; } = [];

    public HttpStatusCode Status { get; set; } = HttpStatusCode.Created;

    public string Body { get; set; } = """{"sid":"VEmadeup","status":"pending"}""";

    public bool Down { get; set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Down)
        {
            throw new HttpRequestException("Twilio is down.");
        }

        Requests.Add(new RecordedRequest(
            request.RequestUri!.AbsolutePath,
            request.RequestUri.Query,
            request.Headers.Authorization?.Parameter,
            request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken)
        ));
        return new HttpResponseMessage(Status)
        {
            Content = new StringContent(Body, Encoding.UTF8, "application/json"),
        };
    }
}
