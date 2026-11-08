using System.Net;
using System.Text;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// The media container's <c>content/reviews.json</c> for tests: counts the requests it gets and answers with
/// <see cref="Status"/> and <see cref="Body"/>, or throws <see cref="Failure"/>.
/// </summary>
public sealed class FakeReviewsHttp : HttpMessageHandler
{
    public const string ValidBody = """
        {
          "score": 4.5,
          "count": 12,
          "url": "https://maps.example.test/listing",
          "testimonials": [
            { "author": "Avery Testwell", "text": "First made-up text" },
            { "author": "Jordan Fixture", "text": "Second made-up text", "rating": 4, "source": "Google review" }
          ]
        }
        """;

    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

    public string Body { get; set; } = ValidBody;

    public Exception? Failure { get; set; }

    public int RequestCount { get; private set; }

    public Uri? RequestUri { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        RequestCount++;
        RequestUri = request.RequestUri;
        if (Failure is not null)
        {
            throw Failure;
        }

        return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Body, Encoding.UTF8, "application/json") });
    }
}
