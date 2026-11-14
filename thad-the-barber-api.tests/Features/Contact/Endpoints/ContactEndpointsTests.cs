using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Contact.Endpoints;

public sealed class ContactEndpointsTests
{
    private const string AnyName = "Quillon Vey-Ashgrove";
    private const string AnyEmail = "quillon@example.test";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AQuestionIs201WithItsIdAndIsSavedAsAFile()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "question", message = "Made-up question.", name = AnyName, email = AnyEmail },
            Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        string fileName = Assert.Single(media.ContentFiles.Keys);
        Assert.StartsWith("contact/", fileName, StringComparison.Ordinal);
        Assert.EndsWith($"-{body.GetProperty("id").GetGuid():N}.json", fileName, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnonymousFeedbackIs201()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "feedback", message = "Made-up praise." },
            Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AQuestionWithoutContactDetailsIsAValidationProblemOnTheMissingFieldsAndSavesNothing()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "question", message = "Made-up question." },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        JsonElement errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("Name", out JsonElement _));
        Assert.True(errors.TryGetProperty("Email", out JsonElement _));
        Assert.True(errors.TryGetProperty("Phone", out JsonElement _));
        Assert.Empty(media.ContentFiles);
    }

    [Fact]
    public async Task AnIssueWithoutAPageOrBookingIsAValidationProblem()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "issue", message = "It broke.", name = AnyName, email = AnyEmail },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("PageOrBooking", out JsonElement _));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ABlankMessageIsAValidationProblem(string message)
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "feedback", message },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        Assert.True(problem.GetProperty("errors").TryGetProperty("Message", out JsonElement _));
    }

    [Fact]
    public async Task FeedbackStillChecksTheContactDetailsItIsGiven()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "feedback", message = "Made-up praise.", email = "not-an-email", phone = "5550100163" },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(response, 400, "validation_failed");
        JsonElement errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("Email", out JsonElement _));
        Assert.True(errors.TryGetProperty("Phone", out JsonElement _));
    }

    [Fact]
    public async Task TooLongTextIsAValidationProblemAndTextAtTheLimitsIsSaved()
    {
        using ApiFactory api = new();
        HttpClient client = api.CreateClient();

        using HttpResponseMessage tooLong = await client.PostAsJsonAsync(
            "/api/contact",
            new { category = "issue", message = new string('m', 2001), name = new string('n', 251), email = AnyEmail, pageOrBooking = new string('p', 301) },
            Cancellation);
        using HttpResponseMessage atLimits = await client.PostAsJsonAsync(
            "/api/contact",
            new { category = "issue", message = new string('m', 2000), name = new string('n', 250), email = AnyEmail, pageOrBooking = new string('p', 300) },
            Cancellation);

        JsonElement problem = await ProblemAssert.IsProblemAsync(tooLong, 400, "validation_failed");
        Assert.Equal(["Message", "Name", "PageOrBooking"], problem.GetProperty("errors").EnumerateObject().Select(error => error.Name).Order().ToList());
        Assert.Equal(HttpStatusCode.Created, atLimits.StatusCode);
    }

    [Theory]
    [InlineData("{\"message\":\"Made-up words.\"}")]
    [InlineData("{\"category\":\"complaint\",\"message\":\"Made-up words.\"}")]
    [InlineData("{\"category\":\"feedback\",\"message\":\"Made-up words.\",\"unexpected\":1}")]
    public async Task ABodyWithoutAKnownCategoryOrWithUnknownFieldsIs400(string body)
    {
        using ApiFactory api = new();
        using StringContent content = new(body, System.Text.Encoding.UTF8, "application/json");

        using HttpResponseMessage response = await api.CreateClient().PostAsync("/api/contact", content, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task WithoutASessionTokenItIs401AndSavesNothing()
    {
        FakeMediaStorage media = new();
        using ApiFactory api = new(media: media);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().PostAsJsonAsync(
            "/api/contact",
            new { category = "feedback", message = "Made-up praise." },
            Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(media.ContentFiles);
    }

    [Fact]
    public async Task WhenTheMessageCannotBeSavedItIs503ContactUnavailable()
    {
        using ApiFactory api = new(media: new FakeMediaStorage { Failure = new InvalidOperationException("Storage is down.") });

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync(
            "/api/contact",
            new { category = "feedback", message = "Made-up praise." },
            Cancellation);

        await ProblemAssert.IsProblemAsync(response, 503, "contact_unavailable");
    }
}
