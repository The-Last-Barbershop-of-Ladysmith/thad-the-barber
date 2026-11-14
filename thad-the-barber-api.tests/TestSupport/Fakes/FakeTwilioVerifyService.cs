using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>
/// Stands in for Twilio Verify in every test (see <see cref="ApiFactory"/>): only <see cref="ApprovedCode"/> is
/// approved, and every phone asked for a code is recorded in <see cref="StartedPhones"/>.
/// </summary>
public sealed class FakeTwilioVerifyService : ITwilioVerifyService
{
    public const string ApprovedCode = "123456";

    public List<string> StartedPhones { get; } = [];

    /// <summary>When set, both calls throw it, as if Twilio were down.</summary>
    public Exception? Failure { get; set; }

    public Task StartAsync(string phone, CancellationToken cancellationToken)
    {
        if (Failure is not null)
        {
            return Task.FromException(Failure);
        }

        StartedPhones.Add(phone);
        return Task.CompletedTask;
    }

    public Task<bool> CheckAsync(string phone, string code, CancellationToken cancellationToken)
    {
        if (Failure is not null)
        {
            return Task.FromException<bool>(Failure);
        }

        return Task.FromResult(code == ApprovedCode && StartedPhones.Contains(phone));
    }
}
