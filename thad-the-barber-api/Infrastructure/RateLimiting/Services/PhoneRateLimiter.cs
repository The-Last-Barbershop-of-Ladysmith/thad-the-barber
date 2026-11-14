using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Common.Exceptions;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Infrastructure.RateLimiting.Services;

/// <summary>
/// Limits how often one phone can be asked for a text code, and how often a code can be guessed for it, whichever
/// address asks. Each limiter is keyed by a hash of the phone, so the number itself is never held as a key or reaches a
/// log. Counts live in memory: a restart resets them, which for one App Service instance only gives an abuser one
/// extra window.
/// </summary>
public sealed class PhoneRateLimiter(IOptions<RateLimitSettings> settings) : IDisposable
{
    private readonly PartitionedRateLimiter<string> _startLimiter = CreateLimiter(() => settings.Value.LookupPhone);
    private readonly PartitionedRateLimiter<string> _verifyLimiter = CreateLimiter(() => settings.Value.LookupVerifyPhone);

    public void EnforceStart(string phone) => Enforce(_startLimiter, phone);

    public void EnforceVerify(string phone) => Enforce(_verifyLimiter, phone);

    public void Dispose()
    {
        _startLimiter.Dispose();
        _verifyLimiter.Dispose();
    }

    private static PartitionedRateLimiter<string> CreateLimiter(Func<FixedWindowLimit> getLimit) =>
        PartitionedRateLimiter.Create<string, string>(phoneHash =>
            RateLimitPartition.GetFixedWindowLimiter(
                phoneHash,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = getLimit().PermitLimit,
                    Window = getLimit().Window,
                }));

    private static void Enforce(PartitionedRateLimiter<string> limiter, string phone)
    {
        string phoneHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(phone)));
        using RateLimitLease lease = limiter.AttemptAcquire(phoneHash);
        if (lease.IsAcquired)
        {
            return;
        }

        lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retryAfter);
        throw new RateLimitedException("A phone used up its text code attempts.", retryAfter);
    }
}
