using ThadTheBarber.Api.Square;

namespace ThadTheBarber.Api.Tests.Fakes;

/// <summary>
/// Stands in for Square in every test (see <see cref="ApiFactory"/>). Each <see cref="ISquareService"/> method returns
/// a settable value, so a test configures only what it checks. As M2 adds methods, add properties here that default to
/// fixture data.
/// </summary>
public sealed class FakeSquareService : ISquareService
{
    public bool Reachable { get; init; } = true;

    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(Reachable);
}
