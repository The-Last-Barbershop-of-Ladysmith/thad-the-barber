using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using ThadTheBarber.Api.Common.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public static class FakeStaleCache
{
    public static StaleCache Create(TimeProvider time) =>
        new(new MemoryCache(new MemoryCacheOptions()), time, NullLogger<StaleCache>.Instance);
}
