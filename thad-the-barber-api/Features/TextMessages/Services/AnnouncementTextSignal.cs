using System.Threading.Channels;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>Tells the announcement-text worker a send was just requested, so it starts at once instead of at its next check.</summary>
public sealed class AnnouncementTextSignal
{
    private readonly Channel<bool> _channel = Channel.CreateBounded<bool>(new BoundedChannelOptions(1)
    {
        FullMode = BoundedChannelFullMode.DropWrite,
    });

    public ChannelReader<bool> Reader => _channel.Reader;

    public void Notify() => _channel.Writer.TryWrite(true);
}
