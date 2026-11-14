using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Services;

/// <summary>
/// Limits how often one phone can be asked for a text code, whichever address asks. The limiter is keyed by a hash of
/// the phone, so the number itself is never held as a key or reaches a log. Counts live in memory: a restart resets
/// them, which for one App Service instance only gives an abuser one extra window.
/// </summary>
public sealed class PhoneRateLimiter(IOptions<RateLimitSettings> settings) : IDisposable
{
    private readonly PartitionedRateLimiter<string> _limiter = PartitionedRateLimiter.Create<string, string>(phoneHash =>
        RateLimitPartition.GetFixedWindowLimiter(
            phoneHash,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = settings.Value.LookupPhone.PermitLimit,
                Window = settings.Value.LookupPhone.Window,
            }));

    public void Enforce(string phone)
    {
        string phoneHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(phone)));
        using RateLimitLease lease = _limiter.AttemptAcquire(phoneHash);
        if (lease.IsAcquired)
        {
            return;
        }

        lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter);
        throw new RateLimitedException("A phone asked for more text codes than its limit allows.", retryAfter);
    }

    public void Dispose() => _limiter.Dispose();
}
