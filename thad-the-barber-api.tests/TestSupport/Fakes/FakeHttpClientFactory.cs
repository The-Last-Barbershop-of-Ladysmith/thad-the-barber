namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Every client it makes sends through <paramref name="handler"/> to <paramref name="baseAddress"/>.</summary>
public sealed class FakeHttpClientFactory(HttpMessageHandler handler, Uri baseAddress) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(handler, disposeHandler: false) { BaseAddress = baseAddress };
}
