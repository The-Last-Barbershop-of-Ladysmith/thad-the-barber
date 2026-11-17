using System.Text;
using System.Text.RegularExpressions;

namespace ThadTheBarber.Api.Features.Gallery.Mappers;

/// <summary>
/// A gallery photo's alt text is made from its file name (BR-34), so naming a new upload is writing its alt text:
/// "Skin fade, beard!" is stored as <c>skin-fade-beard.jpg</c> and shows as "Skin fade beard".
/// </summary>
public static partial class GalleryFileNameMapper
{
    /// <summary>The longest alt text accepted.</summary>
    public const int MaxAltTextLength = 100;

    /// <summary>A stored file name the admin may ask to delete: no folder and no odd characters (hand-uploaded names may have spaces and underscores).</summary>
    public static bool IsSafeFileName(string fileName) => SafeFileName().IsMatch(fileName);

    /// <summary>The words as a file name stem: lower case letters and digits, joined with hyphens; empty when there are none.</summary>
    public static string ToStem(string text)
    {
        StringBuilder stem = new();
        foreach (char letter in text.Normalize(NormalizationForm.FormD))
        {
            if (char.IsAsciiLetterOrDigit(letter))
            {
                stem.Append(char.ToLowerInvariant(letter));
            }
            else if (!char.IsAsciiLetterOrDigit(letter) && stem.Length > 0 && stem[^1] != '-' && !IsCombiningMark(letter))
            {
                stem.Append('-');
            }
        }

        return stem.ToString().Trim('-');
    }

    /// <summary>The first name from <paramref name="stem"/> that <paramref name="isTaken"/> doesn't refuse: <c>stem</c>, then <c>stem-2</c>, <c>stem-3</c>…</summary>
    public static string ToUniqueName(string stem, string extension, Func<string, bool> isTaken)
    {
        string candidate = stem + extension;
        for (int number = 2; isTaken(candidate); number++)
        {
            candidate = $"{stem}-{number}{extension}";
        }

        return candidate;
    }

    private static bool IsCombiningMark(char letter) =>
        System.Globalization.CharUnicodeInfo.GetUnicodeCategory(letter) == System.Globalization.UnicodeCategory.NonSpacingMark;

    [GeneratedRegex(@"^[a-z0-9][a-z0-9_ .-]{0,119}\.(jpg|jpeg|png|webp|avif)$", RegexOptions.IgnoreCase)]
    private static partial Regex SafeFileName();
}
