using System.Text.Json;

namespace ThadTheBarber.Api.Tests.Square;

/// <summary>Reads a recorded Square response from <c>Fixtures/Square</c>, as text or as the SDK type it came from.</summary>
public static class SquareFixture
{
    public static string Text(string fileName) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "Square", fileName));

    public static T Read<T>(string fileName) =>
        JsonSerializer.Deserialize<T>(Text(fileName)) ?? throw new InvalidOperationException($"{fileName} is empty.");
}
