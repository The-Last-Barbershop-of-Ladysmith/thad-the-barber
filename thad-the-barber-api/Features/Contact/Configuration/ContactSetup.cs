using ThadTheBarber.Api.Features.Contact.Services;

namespace ThadTheBarber.Api.Features.Contact.Configuration;

public static class ContactSetup
{
    public static IServiceCollection AddContact(this IServiceCollection services)
    {
        services.AddSingleton<ContactService>();
        return services;
    }
}
