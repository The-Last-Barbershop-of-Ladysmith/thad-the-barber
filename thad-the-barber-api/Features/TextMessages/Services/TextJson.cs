using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.TextMessages.Services;

/// <summary>How the texting blobs are written: camelCase, enums as names, so the files read by eye in the storage browser.</summary>
public static class TextJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    public static readonly JsonSerializerOptions LineOptions = new(Options)
    {
        WriteIndented = false,
    };
}
