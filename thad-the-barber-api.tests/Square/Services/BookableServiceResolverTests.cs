using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Square.Configuration;
using ThadTheBarber.Api.Square.Exceptions;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.Square.Services;

public sealed class BookableServiceResolverTests
{
    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task TheCatalogsOneBookableServiceIsResolved()
    {
        BookableService resolved = await Resolver(new FakeSquareService()).ResolveAsync(Cancellation);

        Assert.Equal("VARIATION0HAIRCUT000TEST", resolved.VariationId);
        Assert.Equal(TimeSpan.FromMinutes(30), resolved.Duration);
    }

    [Fact]
    public async Task APinnedVariationWinsAmongSeveral()
    {
        FakeSquareService square = new()
        {
            BookableServices = FakeSquareService.TwoBookableServices,
        };
        BookableService pinnedService = square.BookableServices[1];

        BookableService resolved = await Resolver(square, pinnedService.VariationId).ResolveAsync(Cancellation);

        Assert.Equal(pinnedService, resolved);
    }

    [Fact]
    public async Task APinnedVariationThatIsntBookableIsNotResolved()
    {
        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(
            () => Resolver(new FakeSquareService(), "MISSING-VARIATION").ResolveAsync(Cancellation));
    }

    [Fact]
    public async Task SeveralBookableServicesAreNotResolved()
    {
        FakeSquareService square = new()
        {
            BookableServices = FakeSquareService.TwoBookableServices,
        };

        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(() => Resolver(square).ResolveAsync(Cancellation));
    }

    [Fact]
    public async Task AnEmptyCatalogIsNotResolved()
    {
        FakeSquareService square = new()
        {
            BookableServices = [],
        };

        await Assert.ThrowsAsync<BookableServiceNotResolvedException>(() => Resolver(square).ResolveAsync(Cancellation));
    }

    private static BookableServiceResolver Resolver(FakeSquareService square, string? pinnedVariationId = null) =>
        new(
            square,
            Options.Create(new SquareSettings
            {
                ServiceVariationId = pinnedVariationId,
            })
        );
}
