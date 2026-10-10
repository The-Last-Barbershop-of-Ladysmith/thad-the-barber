using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.Fakes;

namespace ThadTheBarber.Api.Tests.Square;

public sealed class BookableServiceResolverTests
{
    private static readonly BookableService fixtureService = new FakeSquareService().BookableServices.Single();
    private static readonly BookableService otherService = fixtureService with
    {
        VariationId = "OTHER-VARIATION",
    };

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheCatalogsOneBookableServiceIsResolved()
    {
        BookableService resolved = await Resolver(new FakeSquareService()).ResolveAsync(Cancellation);

        Assert.Equal("TC6VHEWA3WPRAXH6HDMQ5DJN", resolved.VariationId);
        Assert.Equal(TimeSpan.FromMinutes(30), resolved.Duration);
    }

    [Fact]
    public async Task APinnedVariationWinsAmongSeveral()
    {
        FakeSquareService square = new()
        {
            BookableServices = [fixtureService, otherService],
        };

        BookableService resolved = await Resolver(square, otherService.VariationId).ResolveAsync(Cancellation);

        Assert.Equal(otherService, resolved);
    }

    [Fact]
    public async Task APinnedVariationThatIsntBookableIsNotResolved()
    {
        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(
            () => Resolver(new FakeSquareService(), "MISSING-VARIATION").ResolveAsync(Cancellation));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task NoneOrSeveralBookableServicesAreNotResolved(int count)
    {
        FakeSquareService square = new()
        {
            BookableServices = [.. new[] { fixtureService, otherService }.Take(count)],
        };

        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(() => Resolver(square).ResolveAsync(Cancellation));
    }

    [Fact]
    public async Task ASecondLookupIsServedFromTheCache()
    {
        FakeSquareService square = new();
        BookableServiceResolver resolver = Resolver(square);

        await resolver.ResolveAsync(Cancellation);
        await resolver.ResolveAsync(Cancellation);

        Assert.Equal(1, square.CatalogSearches);
    }

    [Fact]
    public async Task AFailedLookupIsntCached()
    {
        FakeSquareService square = new()
        {
            BookableServices = [],
        };
        BookableServiceResolver resolver = Resolver(square);

        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(() => resolver.ResolveAsync(Cancellation));
        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(() => resolver.ResolveAsync(Cancellation));

        Assert.Equal(2, square.CatalogSearches);
    }

    private static BookableServiceResolver Resolver(FakeSquareService square, string? pinnedVariationId = null) =>
        new(
            square,
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new SquareSettings
            {
                ServiceVariationId = pinnedVariationId,
            })
        );
}
