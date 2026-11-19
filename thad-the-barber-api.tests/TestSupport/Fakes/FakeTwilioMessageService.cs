using ThadTheBarber.Api.Twilio.Services;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

/// <summary>Twilio's texting, in memory: every text sent, in order, with a made-up message SID per text.</summary>
public sealed class FakeTwilioMessageService : ITwilioMessageService
{
    public List<SentText> Sent { get; } = [];

    /// <summary>Thrown by every send while set, like Twilio being down.</summary>
    public Exception? Failure { get; set; }

    /// <summary>Phones whose send throws <see cref="PhoneFailure"/>, while everyone else is texted normally.</summary>
    public HashSet<string> FailingPhones { get; } = [];

    public Exception? PhoneFailure { get; set; }

    public Task<string> SendAsync(string phone, string body, CancellationToken cancellationToken)
    {
        if (Failure is not null)
        {
            return Task.FromException<string>(Failure);
        }

        if (PhoneFailure is not null && FailingPhones.Contains(phone))
        {
            return Task.FromException<string>(PhoneFailure);
        }

        string sid = $"SM{Sent.Count + 1:D32}";
        Sent.Add(new SentText(phone, body, sid));
        return Task.FromResult(sid);
    }

    public sealed record SentText(
        string Phone,
        string Body,
        string Sid
    );
}
