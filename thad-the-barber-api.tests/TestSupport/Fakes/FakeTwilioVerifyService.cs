using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed class FakeTwilioVerifyService : ITwilioVerifyService
{
    public const string ApprovedCode = "123456";

    public List<string> StartedPhones { get; } = [];

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
