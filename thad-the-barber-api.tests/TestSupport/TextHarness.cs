using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Features.MarketingTexts.Services;
using ThadTheBarber.Api.Features.TextMessages.Configuration;
using ThadTheBarber.Api.Features.TextMessages.Services;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;

namespace ThadTheBarber.Api.Tests.TestSupport;

/// <summary>
/// The texting services wired over fakes: Twilio, storage, Square and the clock. <see cref="Create"/> switches texts on
/// like a finished environment; <see cref="Disabled"/> is how every environment starts, which changes nothing about a booking.
/// </summary>
public sealed class TextHarness
{
    public const string SiteUrl = "https://www.example.com";

    private TextHarness(FakeSquareService square, FakeMediaStorage storage, FakeTimeProvider time, bool isEnabled)
    {
        Square = square;
        Storage = storage;
        Time = time;
        Settings = new TextMessagesSettings
        {
            IsEnabled = isEnabled,
            SiteUrl = SiteUrl,
        };
        IOptions<TextMessagesSettings> options = Options.Create(Settings);
        IOptions<ThadTheBarber.Api.Infrastructure.Storage.Configuration.MediaStorageSettings> storageSettings = Options.Create(FakeMediaStorageSettings.Create());
        OptIns = new MarketingOptInService(storage, storageSettings, time, NullLogger<MarketingOptInService>.Instance);
        Log = new TextLog(storage, storageSettings, time, NullLogger<TextLog>.Instance);
        Sender = new TextMessageSender(Twilio, storage, storageSettings, options, OptIns, Log, time, NullLogger<TextMessageSender>.Instance);
        Reminders = new ReminderService(square, storage, storageSettings, options, ManageTokens.Signer, Sender, time, NullLogger<ReminderService>.Instance);
        Bookings = new BookingTextService(square, Sender, Reminders, options, NullLogger<BookingTextService>.Instance);
        Worker = new ReminderWorker(Reminders, square, options, time, NullLogger<ReminderWorker>.Instance);
        Signal = new AnnouncementTextSignal();
        Announcements = new AnnouncementTextService(square, OptIns, Sender, Signal, storage, storageSettings, options, time, NullLogger<AnnouncementTextService>.Instance);
        AnnouncementWorker = new AnnouncementTextWorker(Announcements, Signal, time, NullLogger<AnnouncementTextWorker>.Instance);
    }

    public FakeSquareService Square { get; }

    public FakeMediaStorage Storage { get; }

    public FakeTimeProvider Time { get; }

    public TextMessagesSettings Settings { get; }

    public FakeTwilioMessageService Twilio { get; } = new();

    public MarketingOptInService OptIns { get; }

    public TextLog Log { get; }

    public TextMessageSender Sender { get; }

    public ReminderService Reminders { get; }

    public BookingTextService Bookings { get; }

    public ReminderWorker Worker { get; }

    public AnnouncementTextSignal Signal { get; }

    public AnnouncementTextService Announcements { get; }

    public AnnouncementTextWorker AnnouncementWorker { get; }

    public static TextHarness Create(FakeSquareService? square = null, FakeMediaStorage? storage = null, FakeTimeProvider? time = null) =>
        new(square ?? new FakeSquareService(), storage ?? new FakeMediaStorage(), time ?? new FakeTimeProvider(), true);

    public static TextHarness Disabled(FakeSquareService? square = null, FakeMediaStorage? storage = null, FakeTimeProvider? time = null) =>
        new(square ?? new FakeSquareService(), storage ?? new FakeMediaStorage(), time ?? new FakeTimeProvider(), false);
}
