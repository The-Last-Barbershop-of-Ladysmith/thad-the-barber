using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.MarketingTexts.Endpoints;

public sealed class MarketingTextsEndpointsTests
{
    private const string AnyPhone = "+15550100151";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task ASignUpIs204AndListsThePhoneAsASignUp()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/marketing-texts/opt-ins",
            new { phone = AnyPhone, hasConsent = true },
            Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        JsonElement entry = Assert.Single(JsonDocument.Parse(media.ContentFiles[MarketingOptInService.FileName]).RootElement.EnumerateArray());
        Assert.Equal(AnyPhone, entry.GetProperty("phone").GetString());
        Assert.Equal("signUp", entry.GetProperty("source").GetString());
    }

    [Fact]
    public async Task SigningUpAgainIs204AndKeepsTheListAsItWas()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);
        HttpClient client = api.CreateClient();

        using HttpResponseMessage first = await client.PostAsJsonAsync("/api/marketing-texts/opt-ins", new { phone = AnyPhone, hasConsent = true }, Cancellation);
        using HttpResponseMessage second = await client.PostAsJsonAsync("/api/marketing-texts/opt-ins", new { phone = AnyPhone, hasConsent = true }, Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(1, JsonDocument.Parse(media.ContentFiles[MarketingOptInService.FileName]).RootElement.GetArrayLength());
    }

    [Fact]
    public async Task WithoutConsentItIsAValidationProblemOnTheConsentAndListsNothing()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/marketing-texts/opt-ins",
            new { phone = AnyPhone, hasConsent = false },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("HasConsent", out JsonElement _));
        Assert.Empty(media.ContentFiles);
    }

    [Theory]
    [InlineData("5550100151")]
    [InlineData("+1555010015")]
    [InlineData("+155501001512")]
    [InlineData("+445550100151")]
    [InlineData("")]
    public async Task APhoneThatIsNotElevenDigitsWithPlusOneIsAValidationProblem(string phone)
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/marketing-texts/opt-ins",
            new { phone, hasConsent = true },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("Phone", out JsonElement _));
        Assert.Empty(media.ContentFiles);
    }

    [Theory]
    [InlineData("{\"phone\":\"+15550100151\"}")]
    [InlineData("{\"hasConsent\":true}")]
    [InlineData("{\"phone\":\"+15550100151\",\"hasConsent\":true,\"unexpected\":1}")]
    public async Task ABodyMissingAFieldOrWithUnknownFieldsIs400(string body)
    {
        using ApiFactory api = new();
        using StringContent content = new(body, System.Text.Encoding.UTF8, "application/json");

        using HttpResponseMessage response = await api.CreateClient().PostAsync("/api/marketing-texts/opt-ins", content, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task WithoutASessionTokenItIs401AndListsNothing()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().PostAsJsonAsync(
            "/api/marketing-texts/opt-ins",
            new { phone = AnyPhone, hasConsent = true },
            Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(media.ContentFiles);
    }

    [Fact]
    public async Task WhenTheSignUpCannotBeSavedItIs503TextUpdatesUnavailable()
    {
        using ApiFactory api = new(media: new FakeMediaStorage { Failure = new InvalidOperationException("Storage is down.") });

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/marketing-texts/opt-ins",
            new { phone = AnyPhone, hasConsent = true },
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 503, "text_updates_unavailable");
    }
}
