using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.TextMessages.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Configuration;

public static class TextMessagesSetup
{
    public static IServiceCollection AddTextMessages(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<TextMessagesSettings>()
            .Bind(configuration.GetSection(TextMessagesSettings.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<TextMessagesSettings>, TextMessagesSettingsValidator>();
        services.AddSingleton<TextLog>();
        services.AddSingleton<TextMessageSender>();
        services.AddSingleton<ReminderService>();
        services.AddSingleton<BookingTextService>();
        services.AddSingleton<TwilioWebhookService>();
        services.AddSingleton<ReminderWorker>();
        services.AddHostedService(provider => provider.GetRequiredService<ReminderWorker>());
        return services;
    }
}
