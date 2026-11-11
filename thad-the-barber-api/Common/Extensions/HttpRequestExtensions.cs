using System.Buffers;
using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Common.Extensions;

public static class HttpRequestExtensions
{
    /// <summary>
    /// The longest webhook body, in characters. Square's and Event Grid's notifications are a few KB; the cap stops
    /// anonymous callers making the API buffer large bodies, and keeps the read buffer off the large object heap.
    /// </summary>
    public const int MaxWebhookBodyLength = 32 * 1024;

    /// <summary>
    /// Reads a webhook body as raw text. Reading one character past the cap tells a body that's too long, with or without
    /// a <c>Content-Length</c>; it throws a 413 <c>payload_too_large</c>.
    /// </summary>
    public static async Task<string> ReadWebhookBodyAsync(this HttpRequest request, CancellationToken cancellationToken)
    {
        using StreamReader reader = new(request.Body);
        char[] buffer = ArrayPool<char>.Shared.Rent(MaxWebhookBodyLength + 1);
        try
        {
            int length = await reader.ReadBlockAsync(buffer.AsMemory(0, MaxWebhookBodyLength + 1), cancellationToken);
            if (length > MaxWebhookBodyLength)
            {
                throw new WebhookBodyTooLargeException();
            }

            return new string(buffer, 0, length);
        }
        finally
        {
            ArrayPool<char>.Shared.Return(buffer);
        }
    }
}
