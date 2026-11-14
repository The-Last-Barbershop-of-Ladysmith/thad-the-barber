namespace ThadTheBarber.Api.Twilio.Services;

public interface ITwilioVerifyService
{
    Task StartAsync(string phone, CancellationToken cancellationToken);

    Task<bool> CheckAsync(string phone, string code, CancellationToken cancellationToken);
}
