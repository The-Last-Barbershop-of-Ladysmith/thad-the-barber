using System.Collections.Frozen;
using System.Text.RegularExpressions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

public static partial class StringRedactionExtensions
{
    public const string ValuePlaceholder = "[redacted]";

    private const string PhonePlaceholder = "[phone]";
    private const string EmailPlaceholder = "[email]";

    /// <summary>Compared with only letters and digits, lowercased, so <c>customer.name</c> and <c>given_name</c> match.</summary>
    private static readonly FrozenSet<string> PersonalDataKeys = new[]
    {
        "name",
        "firstname",
        "lastname",
        "fullname",
        "givenname",
        "familyname",
        "customername",
        "phone",
        "phonenumber",
        "email",
        "emailaddress",
        "customeremail",
        "customerphone",
    }.ToFrozenSet();

    /// <summary>
    /// Masks phone numbers and email addresses (BR-23). Names have no shape to find in free text; they're caught by their
    /// field name instead (<see cref="IsPersonalDataKey"/>), and Square's error bodies never leave <c>Square/</c>.
    /// </summary>
    public static string Redact(this string text) =>
        PhonePattern().Replace(EmailPattern().Replace(text, EmailPlaceholder), PhonePlaceholder);

    /// <summary>
    /// Whether a log attribute or span tag named this holds a name, phone or email. Whole keys only, so tags like
    /// <c>db.name</c> or <c>service.name</c> keep their values.
    /// </summary>
    public static bool IsPersonalDataKey(this string key) =>
        PersonalDataKeys.Contains(string.Concat(key.Where(char.IsLetterOrDigit)).ToLowerInvariant());

    /// <summary>A log attribute's or span tag's value as it may be exported: personal-data keys lose it, text is redacted.</summary>
    public static object? RedactValue(this string key, object? value)
    {
        if (key.IsPersonalDataKey())
        {
            return ValuePlaceholder;
        }

        if (value is string text)
        {
            return text.Redact();
        }

        return value;
    }

    /// <summary>
    /// A US number with or without +1, bare or with spaces, dots, dashes or brackets, and not part of a longer number
    /// or id, so dates, GUIDs, trace ids and Square ids are left alone.
    /// </summary>
    [GeneratedRegex(@"(?<![\w+])(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\w)")]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")]
    private static partial Regex EmailPattern();
}
