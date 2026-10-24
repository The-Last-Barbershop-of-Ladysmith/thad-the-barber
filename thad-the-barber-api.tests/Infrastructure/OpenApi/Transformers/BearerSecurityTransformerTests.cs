using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.OpenApi.Transformers;

/// <summary>The API's generated OpenAPI document, the one Swagger UI reads in Development.</summary>
public sealed class BearerSecurityTransformerTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheDocumentDeclaresTheSessionBearerToken()
    {
        OpenApiDocument document = await DocumentAsync();

        IOpenApiSecurityScheme scheme = document.Components!.SecuritySchemes!["Bearer"];
        Assert.Equal(SecuritySchemeType.Http, scheme.Type);
        Assert.Equal("bearer", scheme.Scheme);
    }

    [Theory]
    [InlineData("/api/bookings/availability", "GET")]
    [InlineData("/api/bookings", "POST")]
    public async Task AProtectedOperationRequiresTheToken(string path, string method)
    {
        OpenApiOperation operation = await OperationAsync(path, method);

        OpenApiSecurityRequirement requirement = Assert.Single(operation.Security!);
        Assert.Equal("Bearer", Assert.Single(requirement.Keys).Reference.Id);
    }

    [Theory]
    [InlineData("/api/session", "POST")]
    [InlineData("/api/health", "GET")]
    [InlineData("/api/shop", "GET")]
    public async Task AnAnonymousOperationRequiresNothing(string path, string method)
    {
        OpenApiOperation operation = await OperationAsync(path, method);

        Assert.Empty(operation.Security ?? []);
    }

    private async Task<OpenApiDocument> DocumentAsync() =>
        await factory.Services.GetRequiredKeyedService<IOpenApiDocumentProvider>("v1").GetOpenApiDocumentAsync(Cancellation);

    private async Task<OpenApiOperation> OperationAsync(string path, string method)
    {
        OpenApiDocument document = await DocumentAsync();
        return document.Paths[path].Operations![new HttpMethod(method)];
    }
}
