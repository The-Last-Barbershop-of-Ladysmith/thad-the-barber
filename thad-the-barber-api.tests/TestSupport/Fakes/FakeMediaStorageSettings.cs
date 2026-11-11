using ThadTheBarber.Api.Infrastructure.Storage.Configuration;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public static class FakeMediaStorageSettings
{
    public static MediaStorageSettings Create() =>
        new()
        {
            AccountName = "fakeaccount",
            MediaContainerName = "media-fake",
            ContentContainerName = "content-fake",
        };
}
