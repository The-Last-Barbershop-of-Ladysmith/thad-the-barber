using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http;
using ThadTheBarber.Api.Square.Endpoints;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Square.Endpoints;

public sealed class SquareWebhookEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Path = "/api/webhooks/square";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASignedNotificationIs200WithoutASessionToken()
    {
        string body = SquareFixture.ReadText("webhook-customer-created.json");

        using HttpResponseMessage response = await PostAsync(body, SquareWebhooks.Sign(body));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AWrongSignatureIs401InvalidSignature()
    {
        string body = SquareFixture.ReadText("webhook-location-updated.json");

        using HttpResponseMessage response = await PostAsync(body, SquareWebhooks.Sign(body, key: "another-made-up-key"));

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status401Unauthorized, "invalid_signature");
    }

    [Fact]
    public async Task AMissingSignatureIs401InvalidSignature()
    {
        using HttpResponseMessage response = await PostAsync(SquareFixture.ReadText("webhook-location-updated.json"), signature: null);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status401Unauthorized, "invalid_signature");
    }

    [Fact]
    public async Task ABodyOverTheCapIs413PayloadTooLarge()
    {
        string body = new('x', SquareWebhookEndpoints.MaxBodyLength + 1);

        using HttpResponseMessage response = await PostAsync(body, SquareWebhooks.Sign(body));

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status413PayloadTooLarge, "payload_too_large");
    }

    private async Task<HttpResponseMessage> PostAsync(string body, string? signature)
    {
        using HttpRequestMessage request = new(HttpMethod.Post, Path)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        if (signature is not null)
        {
            request.Headers.Add(SquareWebhookEndpoints.SignatureHeader, signature);
        }

        return await factory.CreateClientWithoutToken().SendAsync(request, Cancellation);
    }
}
