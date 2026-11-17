using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Features.Admin.Endpoints;

public sealed class AdminEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AnAllowedGoogleAccountGetsAnAdminSessionThatOpensTheAdminArea()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClient();

        using HttpResponseMessage signIn = await SignInAsync(client, GoogleIdTokens.Create(api.GoogleKeys.Key));

        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);
        Assert.True(signIn.Headers.CacheControl?.NoStore);
        JsonElement session = await signIn.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(AdminHarness.AllowedEmail, session.GetProperty("email").GetString());
        Assert.True(session.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.GetProperty("token").GetString());
        using HttpResponseMessage me = await client.GetAsync("/api/admin/me", Cancellation);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        JsonElement profile = await me.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(AdminHarness.AllowedEmail, profile.GetProperty("email").GetString());
    }

    [Fact]
    public async Task AnAdminSessionAlsoOpensTheRestOfTheApi()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key));

        using HttpResponseMessage shop = await client.GetAsync("/api/shop", Cancellation);

        Assert.Equal(HttpStatusCode.OK, shop.StatusCode);
    }

    [Fact]
    public async Task AnyOtherGoogleAccountIs403NotAuthorized()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await SignInAsync(
            api.CreateClient(),
            GoogleIdTokens.Create(api.GoogleKeys.Key, email: AdminHarness.OtherEmail));

        await ProblemAssert.IsProblemAsync(response, 403, "not_authorized");
    }

    [Fact]
    public async Task ATokenGoogleDidNotSignIs401InvalidIdToken()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await SignInAsync(
            api.CreateClient(),
            GoogleIdTokens.Create(new TestSupport.Fakes.FakeGoogleSigningKeys().Key));

        await ProblemAssert.IsProblemAsync(response, 401, "invalid_id_token");
    }

    [Theory]
    [InlineData("")]
    [InlineData("{}")]
    [InlineData("""{"idToken":null}""")]
    public async Task AMissingIdTokenIs401InvalidIdToken(string body)
    {
        using ApiFactory api = new();
        using HttpRequestMessage request = new(HttpMethod.Post, "/api/admin/session")
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        };

        using HttpResponseMessage response = await api.CreateClient().SendAsync(request, Cancellation);

        await ProblemAssert.IsProblemAsync(response, 401, "invalid_id_token");
    }

    [Fact]
    public async Task AnEnvironmentWithNoClientIdIs503AdminUnavailable()
    {
        using ApiFactory api = new();
        using WebApplicationFactory<Program> unconfigured = api.WithWebHostBuilder(builder => builder.UseSetting("Admin:GoogleClientId", ""));

        using HttpResponseMessage response = await SignInAsync(unconfigured.CreateClient(), GoogleIdTokens.Create(api.GoogleKeys.Key));

        await ProblemAssert.IsProblemAsync(response, 503, "admin_unavailable");
    }

    [Fact]
    public async Task AdminCallsWithNoTokenAre401()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync("/api/admin/me", Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AnExpiredAdminTokenIs401()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            AdminTokens.Create(api.SigningKey.Key, expires: DateTime.UtcNow.AddMinutes(-5)));

        using HttpResponseMessage response = await client.GetAsync("/api/admin/me", Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AnOrdinaryVisitorSessionIs403InTheAdminArea()
    {
        using ApiFactory api = new();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/admin/me", Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("visitor")]
    public async Task AnAdminAudienceTokenWithoutTheAdminRoleIs403(string? role)
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key, role: role));

        using HttpResponseMessage response = await client.GetAsync("/api/admin/me", Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ATokenForAnotherAudienceIs401EvenWithTheAdminRole()
    {
        using ApiFactory api = new();
        using HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            AdminTokens.Create(api.SigningKey.Key, audience: "someone-else"));

        using HttpResponseMessage response = await client.GetAsync("/api/admin/me", Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static Task<HttpResponseMessage> SignInAsync(HttpClient client, string idToken) =>
        client.PostAsJsonAsync("/api/admin/session", new { idToken }, Cancellation);
}
