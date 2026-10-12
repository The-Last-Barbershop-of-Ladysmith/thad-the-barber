using System.Net.Http.Json;
using System.Text.Json;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>Checks the error contract every failure keeps: ProblemDetails with <c>type</c>, <c>title</c>, <c>status</c> and <c>code</c>.</summary>
public static class ProblemAssert
{
    public static async Task<JsonElement> IsProblemAsync(HttpResponseMessage response, int expectedStatus, string expectedCode)
    {
        Assert.Equal(expectedStatus, (int)response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("type").GetString()));
        Assert.False(string.IsNullOrEmpty(body.GetProperty("title").GetString()));
        Assert.Equal(expectedStatus, body.GetProperty("status").GetInt32());
        Assert.Equal(expectedCode, body.GetProperty("code").GetString());
        return body;
    }
}
