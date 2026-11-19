using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.Features.TextMessages.Endpoints;

public sealed class AdminAnnouncementTextsEndpointsTests
{
    private const string Preview = "/api/admin/announcement-texts/preview";
    private const string Texts = "/api/admin/announcement-texts";

    private static readonly DateTimeOffset now = new(2026, 11, 18, 15, 0, 0, TimeSpan.Zero);

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task OnlyAnAdminSessionCanPreviewRequestOrReadAText()
    {
        using ApiFactory api = new();

        using HttpResponseMessage visitorPreview = await api.CreateClient().PostAsJsonAsync(Preview, Preview_("Open late"), Cancellation);
        using HttpResponseMessage visitorRequest = await api.CreateClient().PostAsJsonAsync(Texts, Request("Open late"), Cancellation);
        using HttpResponseMessage visitorStatus = await api.CreateClient().GetAsync($"{Texts}/anything", Cancellation);
        using HttpResponseMessage anonymous = await api.CreateClientWithoutToken().PostAsJsonAsync(Texts, Request("Open late"), Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, visitorPreview.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorRequest.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorStatus.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task WhileTextsAreOffARequestIs503AndNothingIsWritten()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.PostAsJsonAsync(Texts, Request("Open late"), Cancellation);

        await ProblemAssert.IsProblemAsync(response, 503, "texts_unavailable");
        Assert.DoesNotContain(media.ContentFiles.Keys, name => name.StartsWith("announcement-sends/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ThePreviewHasTheSuggestedWordingTheSubscriberCountAndWhetherTextsAreOn()
    {
        (_, HttpClient client, _) = await EnabledHostAsync(2);

        using HttpResponseMessage response = await client.PostAsJsonAsync(Preview, Preview_("Open late Fridays"), Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(2, body.GetProperty("subscriberCount").GetInt32());
        Assert.True(body.GetProperty("isEnabled").GetBoolean());
        Assert.False(body.GetProperty("isScheduled").GetBoolean());
        Assert.Contains("Open late Fridays", body.GetProperty("message").GetString(), StringComparison.Ordinal);
        Assert.Contains("Reply STOP to opt out.", body.GetProperty("message").GetString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task ARequestIs202AndTheSubscribersAreTextedInTheBackgroundOnce()
    {
        (FakeTwilioMessageService twilio, HttpClient client, _) = await EnabledHostAsync(2);

        using HttpResponseMessage accepted = await client.PostAsJsonAsync(Texts, Request("Open late Fridays"), Cancellation);
        JsonElement status = await accepted.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        string id = status.GetProperty("id").GetString()!;
        JsonElement done = await WaitUntilDoneAsync(client, id);

        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        Assert.Equal($"/api/admin/announcement-texts/{id}", accepted.Headers.Location?.OriginalString);
        Assert.Equal(2, done.GetProperty("sentCount").GetInt32());
        Assert.Equal(2, twilio.Sent.Count);
        Assert.All(twilio.Sent, text => Assert.StartsWith("Open late Fridays", text.Body, StringComparison.Ordinal));
    }

    [Fact]
    public async Task ARepeatedRequestForTheSameAnnouncementIs409()
    {
        (FakeTwilioMessageService twilio, HttpClient client, _) = await EnabledHostAsync(1);
        using HttpResponseMessage first = await client.PostAsJsonAsync(Texts, Request("Open late Fridays"), Cancellation);
        await WaitUntilDoneAsync(client, (await first.Content.ReadFromJsonAsync<JsonElement>(Cancellation)).GetProperty("id").GetString()!);

        using HttpResponseMessage second = await client.PostAsJsonAsync(Texts, Request("Open late Fridays"), Cancellation);

        await ProblemAssert.IsProblemAsync(second, 409, "already_texted");
        Assert.Single(twilio.Sent);
    }

    [Fact]
    public async Task APreviewAfterTheTextShowsItWasAlreadyTexted()
    {
        (_, HttpClient client, _) = await EnabledHostAsync(1);
        using HttpResponseMessage first = await client.PostAsJsonAsync(Texts, Request("Open late Fridays"), Cancellation);
        await WaitUntilDoneAsync(client, (await first.Content.ReadFromJsonAsync<JsonElement>(Cancellation)).GetProperty("id").GetString()!);

        using HttpResponseMessage response = await client.PostAsJsonAsync(Preview, Preview_("Open late Fridays"), Cancellation);

        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("done", body.GetProperty("alreadyTexted").GetProperty("state").GetString());
    }

    [Fact]
    public async Task ARequestWithoutAMessageIsAValidationProblem()
    {
        (_, HttpClient client, _) = await EnabledHostAsync(1);

        using HttpResponseMessage response = await client.PostAsJsonAsync(
            Texts, new { title = "Open late", startDate = "2026-11-18", message = "  " }, Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("Message", out JsonElement _));
    }

    [Fact]
    public async Task AnUnknownTextIs404()
    {
        (_, HttpClient client, _) = await EnabledHostAsync(0);

        using HttpResponseMessage response = await client.GetAsync($"{Texts}/20261118-000000000000", Cancellation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static object Request(string title) => new { title, startDate = "2026-11-18", message = $"{title}! Reply STOP to opt out." };

    private static object Preview_(string title) => new { title, bodyHtml = "<p>Until 8 PM.</p>", startDate = "2026-11-18" };

    private static HttpClient AdminClient(WebApplicationFactory<Program> host, ApiFactory api)
    {
        HttpClient client = host.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key));
        return client;
    }

    private static HttpClient AdminClient(ApiFactory api) => AdminClient(api, api);

    private static async Task<(FakeTwilioMessageService Twilio, HttpClient Client, FakeMediaStorage Media)> EnabledHostAsync(int subscribers)
    {
        FakeMediaStorage media = new();
        FakeTwilioMessageService twilio = new();
        ApiFactory api = new(time: new FakeTimeProvider(now), media: media);
        WebApplicationFactory<Program> host = api.WithWebHostBuilder(builder =>
        {
            TwilioWebhooks.ConfigureTwilio(builder);
            builder.UseSetting("Twilio:FromNumber", "+15005550006");
            builder.UseSetting("TextMessages:IsEnabled", "true");
            builder.UseSetting("TextMessages:SiteUrl", "https://www.example.com");
            builder.ConfigureTestServices(services => services.AddSingleton<ITwilioMessageService>(twilio));
        });
        MarketingOptInService optIns = host.Services.GetRequiredService<MarketingOptInService>();
        for (int index = 0; index < subscribers; index++)
        {
            await optIns.SignUpAsync($"+155501002{10 + index}", Cancellation);
        }

        return (twilio, AdminClient(host, api), media);
    }

    private static async Task<JsonElement> WaitUntilDoneAsync(HttpClient client, string id)
    {
        using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(Cancellation);
        timeout.CancelAfter(TimeSpan.FromSeconds(20));
        while (true)
        {
            JsonElement status = await client.GetFromJsonAsync<JsonElement>($"{Texts}/{id}", timeout.Token);
            if (status.GetProperty("state").GetString() == "done")
            {
                return status;
            }

            await Task.Delay(50, timeout.Token);
        }
    }
}
