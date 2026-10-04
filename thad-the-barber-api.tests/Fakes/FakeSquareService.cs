using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Tests.Fakes;

/// <summary>
/// Stands in for Square in every test (see <see cref="ApiFactory"/>). Each <see cref="ISquareService"/> method returns
/// a settable value, so a test configures only what it checks. As M2 adds methods, add properties here that default to
/// fixture data.
/// </summary>
public sealed class FakeSquareService : ISquareService
{
    private int _checks;

    public SquareConnection Connection { get; init; } = SquareConnection.Connected;

    public int Checks => _checks;

    public Task<SquareConnection> CheckConnectionAsync(CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _checks);
        return Task.FromResult(Connection);
    }
}
