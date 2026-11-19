using Microsoft.Extensions.Options;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Features.TextMessages.Models;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Square.Services;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>
/// What a booking sets off: its confirmation text with the manage link, and its reminder job. Every method catches and
/// logs its own failures, because the booking itself has already been made and a text that fails never undoes it.
/// </summary>
public sealed partial class BookingTextService(
    ISquareService square,
    TextMessageSender sender,
    ReminderService reminders,
    IOptions<TextMessagesSettings> settings,
    ILogger<BookingTextService> logger)
{
    public async Task AfterBookedAsync(Appointment appointment, string phone, CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            return;
        }

        try
        {
            ShopDetails shop = await square.GetShopDetailsAsync(cancellationToken);
            TimeZoneInfo zone = TimeZoneInfo.FindSystemTimeZoneById(shop.TimeZone);
            string body = BookingTextMessages.Confirmation(shop.Name, zone, appointment.StartAt, reminders.ManageLink(appointment.Id));
            await sender.SendOnceAsync(TextKind.Confirmation, TextBlobNames.Confirmation(appointment.Id), appointment.Id, phone, body, cancellationToken);
            await reminders.ScheduleAsync(appointment, phone, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotHandled(logger, exception, "booked");
        }
    }

    public async Task AfterCancelledAsync(Appointment appointment, CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            return;
        }

        try
        {
            await reminders.CancelAsync(appointment, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotHandled(logger, exception, "cancelled");
        }
    }

    /// <summary>The reminder moves with the booking: the old day's job goes, and a new one is made for the new time.</summary>
    public async Task AfterRescheduledAsync(Appointment before, Appointment after, CancellationToken cancellationToken)
    {
        if (!settings.Value.IsEnabled)
        {
            return;
        }

        try
        {
            string? phone = await reminders.FindPhoneAsync(before, cancellationToken);
            await reminders.CancelAsync(before, cancellationToken);
            if (phone is not null)
            {
                await reminders.ScheduleAsync(after, phone, cancellationToken);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            LogNotHandled(logger, exception, "rescheduled");
        }
    }

    [LoggerMessage(EventName = "BookingTextNotHandled", Level = LogLevel.Error, Message = "The texts for a booking that was {Change} couldn't be handled.")]
    private static partial void LogNotHandled(ILogger logger, Exception exception, string change);
}
