using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Features.Gallery.Endpoints;

public sealed class AdminGalleryEndpointsTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static HttpClient AdminClient(ApiFactory api)
    {
        HttpClient client = api.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AdminTokens.Create(api.SigningKey.Key));
        return client;
    }

    private static MultipartFormDataContent Form(byte[]? file, string? altText, string fileName = "photo.jpg")
    {
        MultipartFormDataContent form = [];
        if (file is not null)
        {
            ByteArrayContent content = new(file);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(content, "file", fileName);
        }

        if (altText is not null)
        {
            form.Add(new StringContent(altText), "altText");
        }

        return form;
    }

    [Fact]
    public async Task OnlyAnAdminSessionCanReadAddOrDelete()
    {
        using ApiFactory api = new();
        using MultipartFormDataContent form = Form(ImageBytes.Jpeg, "Fade");

        using HttpResponseMessage visitorRead = await api.CreateClient().GetAsync("/api/admin/gallery", Cancellation);
        using HttpResponseMessage visitorUpload = await api.CreateClient().PostAsync("/api/admin/gallery", form, Cancellation);
        using HttpResponseMessage visitorDelete = await api.CreateClient().DeleteAsync("/api/admin/gallery/older_print.jpg", Cancellation);
        using HttpResponseMessage anonymous = await api.CreateClientWithoutToken().GetAsync("/api/admin/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.Forbidden, visitorRead.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorUpload.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, visitorDelete.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task TheAdminListHasFileNamesAltTextAndUploadTimes()
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage response = await client.GetAsync("/api/admin/gallery", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement body = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("newer-print.webp", body[0].GetProperty("fileName").GetString());
        Assert.Equal("Newer print", body[0].GetProperty("altText").GetString());
        Assert.True(body[0].TryGetProperty("src", out _));
        Assert.True(body[0].TryGetProperty("uploadedAt", out _));
    }

    [Fact]
    public async Task AnUploadIs201AndShowsOnThePublicGallery()
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        using MultipartFormDataContent form = Form(ImageBytes.Jpeg, "Skin fade beard");

        using HttpResponseMessage response = await client.PostAsync("/api/admin/gallery", form, Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        JsonElement photo = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("skin-fade-beard.jpg", photo.GetProperty("fileName").GetString());
        Assert.Equal("Skin fade beard", photo.GetProperty("altText").GetString());
        Assert.True(storage.MediaFiles.ContainsKey("gallery/skin-fade-beard.jpg"));
        JsonElement publicList = await api.CreateClient().GetFromJsonAsync<JsonElement>("/api/gallery", Cancellation);
        Assert.Contains(publicList.EnumerateArray(), item => item.GetProperty("alt").GetString() == "Skin fade beard");
    }

    [Theory]
    [InlineData("script")]
    [InlineData("nofile")]
    [InlineData("noalt")]
    public async Task AnUnusableUploadIs400InvalidImageAndNothingIsStored(string problem)
    {
        FakeMediaStorage storage = new();
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        using MultipartFormDataContent form = problem switch
        {
            "script" => Form(ImageBytes.Script, "Fade", "evil.jpg"),
            "nofile" => Form(null, "Fade"),
            _ => Form(ImageBytes.Jpeg, null),
        };

        using HttpResponseMessage response = await client.PostAsync("/api/admin/gallery", form, Cancellation);

        await ProblemAssert.IsProblemAsync(response, 400, "invalid_image");
        Assert.Empty(storage.MediaFiles);
    }

    [Fact]
    public async Task DeletingIs204ThenTheSamePhotoIs404()
    {
        using ApiFactory api = new();
        using HttpClient client = AdminClient(api);

        using HttpResponseMessage deleted = await client.DeleteAsync("/api/admin/gallery/older_print.jpg", Cancellation);
        using HttpResponseMessage again = await client.DeleteAsync("/api/admin/gallery/older_print.jpg", Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        await ProblemAssert.IsProblemAsync(again, 404, "photo_not_found");
    }

    [Fact]
    public async Task StorageBeingDownIs503GalleryUnavailable()
    {
        FakeMediaStorage storage = new() { Failure = new IOException("down") };
        using ApiFactory api = new(media: storage);
        using HttpClient client = AdminClient(api);
        using MultipartFormDataContent form = Form(ImageBytes.Jpeg, "Fade");

        using HttpResponseMessage read = await client.GetAsync("/api/admin/gallery", Cancellation);
        using HttpResponseMessage upload = await client.PostAsync("/api/admin/gallery", form, Cancellation);

        await ProblemAssert.IsProblemAsync(read, 503, "gallery_unavailable");
        await ProblemAssert.IsProblemAsync(upload, 503, "gallery_unavailable");
    }
}
