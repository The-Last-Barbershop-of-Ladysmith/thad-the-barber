using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using ThadTheBarber.Api.Features.TextMessages.Endpoints;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Twilio's webhook calls: a form post signed the way Twilio signs it (HMAC-SHA1 of the public URL and the sorted fields).</summary>
public static class TwilioWebhooks
{
    public const string AuthToken = "made-up-twilio-auth-token";
    public const string BaseUrl = "https://api.example.com";

    /// <summary>The host with the Twilio settings a webhook needs; the rest of the setup stays as the factory made it.</summary>
    public static WebApplicationFactory<Program> WithTwilioWebhooks(this ApiFactory api) =>
        api.WithWebHostBuilder(builder => ConfigureTwilio(builder));

    public static IWebHostBuilder ConfigureTwilio(IWebHostBuilder builder)
    {
        builder.UseSetting("Twilio:AccountSid", "AC0000000000000000000000000000000f");
        builder.UseSetting("Twilio:VerifyServiceSid", "VA0000000000000000000000000000000f");
        builder.UseSetting("Twilio:ApiKeySid", "SK0000000000000000000000000000000f");
        builder.UseSetting("Twilio:ApiKeySecret", "made-up-secret");
        builder.UseSetting("Twilio:AuthToken", AuthToken);
        builder.UseSetting("Twilio:WebhookBaseUrl", BaseUrl);
        return builder;
    }

    public static HttpRequestMessage SignedRequest(string path, Dictionary<string, string> form) =>
        Request(path, form, Sign(BaseUrl + path, form));

    public static HttpRequestMessage Request(string path, Dictionary<string, string> form, string? signature)
    {
        HttpRequestMessage request = new(HttpMethod.Post, path)
        {
            Content = new FormUrlEncodedContent(form),
        };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-www-form-urlencoded");
        if (signature is not null)
        {
            request.Headers.Add(TwilioWebhookEndpoints.SignatureHeader, signature);
        }

        return request;
    }

    public static string Sign(string url, Dictionary<string, string> form)
    {
        StringBuilder signed = new(url);
        foreach (KeyValuePair<string, string> field in form.OrderBy(field => field.Key, StringComparer.Ordinal))
        {
            signed.Append(field.Key).Append(field.Value);
        }

#pragma warning disable CA5350 // Twilio signs its webhooks with HMAC-SHA1; this makes the same signature to test with.
        return Convert.ToBase64String(HMACSHA1.HashData(Encoding.UTF8.GetBytes(AuthToken), Encoding.UTF8.GetBytes(signed.ToString())));
#pragma warning restore CA5350
    }
}
