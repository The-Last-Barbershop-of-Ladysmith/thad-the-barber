using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ThadTheBarber.Api.Features.Session.Services;
using ThadTheBarber.Api.Recaptcha.Services;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// Hosts the API in a "Testing" environment with made-up origins, a fake Square service, a fake reCAPTCHA and an
/// in-memory session signing key, so tests never touch Azure, Square or Google. "Testing" is not Development (so
/// production middleware like HSTS runs) and not an Azure environment (so appsettings.Development.json /
/// appsettings.Test.json, and their Key Vault names, never load). Its clients send a valid session token, like the UI;
/// use <see cref="CreateClientWithoutToken"/> to call as a stranger.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string FrontendOrigin = "https://app.example.com";
    public const string CustomDomainOrigin = "https://www.example.com";

    /// <summary>32 made-up bytes, base64; the shortest key <c>ManageLinkSettingsValidator</c> accepts.</summary>
    public const string ManageLinkHmacKey = "dGVzdC1vbmx5LW1hbmFnZS1saW5rLWtleS0zMmJ5dGU=";

    private readonly string[] _origins;
    private readonly ISquareService _square;
    private readonly TimeProvider _time;
    private readonly FakeRecaptchaService _recaptcha;

    public ApiFactory()
        : this(null, null, null, null)
    {
    }

    /// <param name="origins">The CORS allow-list; defaults to <see cref="FrontendOrigin"/> and <see cref="CustomDomainOrigin"/>.</param>
    /// <param name="square">
    /// Replaces Square for this host, cache included; defaults to a connected <see cref="FakeSquareService"/>.
    /// </param>
    /// <param name="time">Replaces the clock; defaults to the real one.</param>
    /// <param name="recaptcha">Replaces reCAPTCHA; defaults to a <see cref="FakeRecaptchaService"/> that passes everyone.</param>
    internal ApiFactory(
        string[]? origins = null,
        ISquareService? square = null,
        TimeProvider? time = null,
        FakeRecaptchaService? recaptcha = null)
    {
        _origins = origins ?? [FrontendOrigin, CustomDomainOrigin];
        _square = square ?? new FakeSquareService();
        _time = time ?? TimeProvider.System;
        _recaptcha = recaptcha ?? new FakeRecaptchaService();
    }

    public FakeSessionSigningKey SigningKey { get; } = new();

    /// <summary>This host with its logs collected; read them from <c>Services.GetFakeLogCollector()</c>.</summary>
    public WebApplicationFactory<Program> WithFakeLogging() =>
        WithWebHostBuilder(builder => builder.ConfigureServices(services => services.AddLogging(logging => logging.AddFakeLogging())));

    public HttpClient CreateClientWithoutToken()
    {
        HttpClient client = CreateClient();
        client.DefaultRequestHeaders.Authorization = null;
        return client;
    }

    protected override void ConfigureClient(HttpClient client)
    {
        base.ConfigureClient(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            JwtBearerDefaults.AuthenticationScheme,
            SessionTokens.Create(SigningKey.Key)
        );
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Square:ApplicationId", SquareHarness.ApplicationId);
        builder.UseSetting("Recaptcha:ProjectId", "fake-project");
        builder.UseSetting("Recaptcha:SiteKey", "fake-site-key");
        builder.UseSetting("Recaptcha:ApiKey", "fake-api-key");
        builder.UseSetting("ManageLink:HmacKey", ManageLinkHmacKey);
        for (int i = 0; i < _origins.Length; i++)
        {
            builder.UseSetting($"Cors:AllowedOrigins:{i}", _origins[i]);
        }

        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton(_square);
            services.AddSingleton(_time);
            services.AddSingleton<IRecaptchaService>(_recaptcha);
            services.AddSingleton<ISessionSigningKey>(SigningKey);
        });
    }
}
