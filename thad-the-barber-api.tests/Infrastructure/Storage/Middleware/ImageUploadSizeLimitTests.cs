using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using ThadTheBarber.Api.Infrastructure.Storage.Middleware;
using ThadTheBarber.Api.Infrastructure.Storage.Models;
using ThadTheBarber.Api.Infrastructure.Storage.Services;
using ThadTheBarber.Api.Tests.TestSupport;

namespace ThadTheBarber.Api.Tests.Infrastructure.Storage.Middleware;

public sealed class ImageUploadSizeLimitTests
{
    private const long SmallLimit = 128 * 1024;

    [Fact]
    public async Task APhotoUploadMayCarryTheLargestPhotoAndTheFormAroundIt()
    {
        FakeBodySizeFeature feature = await RunAsync(new EndpointMetadataCollection(new ImageUploadMetadata()), isReadOnly: false);

        Assert.Equal(ImageFileInspector.MaxBytes + ImageUploadSizeLimit.FormOverheadBytes, feature.MaxRequestBodySize);
        Assert.True(feature.MaxRequestBodySize > ImageFileInspector.MaxBytes);
    }

    [Fact]
    public async Task EveryOtherEndpointKeepsTheSmallLimit()
    {
        FakeBodySizeFeature feature = await RunAsync(EndpointMetadataCollection.Empty, isReadOnly: false);

        Assert.Equal(SmallLimit, feature.MaxRequestBodySize);
    }

    [Fact]
    public async Task ABodyThatIsAlreadyBeingReadKeepsItsLimit()
    {
        FakeBodySizeFeature feature = await RunAsync(new EndpointMetadataCollection(new ImageUploadMetadata()), isReadOnly: true);

        Assert.Equal(SmallLimit, feature.MaxRequestBodySize);
    }

    [Theory]
    [InlineData("UploadAdminGalleryPhoto")]
    [InlineData("UploadAdminAnnouncementImage")]
    public void BothPhotoUploadEndpointsAreMarked(string endpointName)
    {
        using ApiFactory api = new();
        EndpointDataSource endpoints = api.Services.GetRequiredService<EndpointDataSource>();

        Endpoint upload = Assert.Single(
            endpoints.Endpoints,
            endpoint => endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName == endpointName
        );

        Assert.NotNull(upload.Metadata.GetMetadata<ImageUploadMetadata>());
    }

    [Fact]
    public void NoOtherAdminEndpointIsMarked()
    {
        using ApiFactory api = new();
        EndpointDataSource endpoints = api.Services.GetRequiredService<EndpointDataSource>();

        List<string?> marked = endpoints.Endpoints
            .Where(endpoint => endpoint.Metadata.GetMetadata<ImageUploadMetadata>() is not null)
            .Select(endpoint => endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName)
            .Order()
            .ToList();

        Assert.Equal(["UploadAdminAnnouncementImage", "UploadAdminGalleryPhoto"], marked);
    }

    private static async Task<FakeBodySizeFeature> RunAsync(EndpointMetadataCollection metadata, bool isReadOnly)
    {
        FakeBodySizeFeature feature = new(isReadOnly) { MaxRequestBodySize = SmallLimit };
        DefaultHttpContext context = new();
        context.Features.Set<IHttpMaxRequestBodySizeFeature>(feature);
        context.SetEndpoint(new Endpoint(requestDelegate: null, metadata, displayName: "test"));
        ApplicationBuilder app = new(new ServiceCollection().BuildServiceProvider());
        app.UseImageUploadSizeLimit();
        RequestDelegate pipeline = app.Build();

        await pipeline(context);

        return feature;
    }

    private sealed class FakeBodySizeFeature(bool isReadOnly) : IHttpMaxRequestBodySizeFeature
    {
        public bool IsReadOnly { get; } = isReadOnly;

        public long? MaxRequestBodySize { get; set; }
    }
}
