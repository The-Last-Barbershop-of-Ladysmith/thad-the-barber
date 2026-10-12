using System.Collections;
using System.Collections.Concurrent;
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

    /// <summary>Keys come from code, a small fixed set, so each is normalized once.</summary>
    private static readonly ConcurrentDictionary<string, bool> PersonalDataKeyCache = new();

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
        PersonalDataKeyCache.GetOrAdd(key, static newKey => PersonalDataKeys.Contains(string.Concat(newKey.Where(char.IsLetterOrDigit)).ToLowerInvariant()));

    /// <summary>
    /// A log attribute's or span tag's value as it may be exported: personal-data keys lose it, and text is redacted.
    /// Objects the exporter would print with <c>ToString()</c> (a record lists every property) are printed and redacted
    /// here instead; numbers, dates, booleans and arrays are left as they are.
    /// </summary>
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

        if (value is null or IFormattable or bool or IEnumerable)
        {
            return value;
        }

        return value.ToString()?.Redact();
    }

    /// <summary>
    /// A US number with or without +1 (or a URL-encoded <c>%2B1</c>), bare or with spaces, dots, dashes or brackets, and
    /// not part of a longer number or id, so dates, GUIDs, trace ids and Square ids are left alone. Any other 10-digit
    /// run, such as epoch seconds, is masked too; that's the price of never missing a phone.
    /// </summary>
    [GeneratedRegex(@"(?:(?<=%2B)|(?<![\w+]))(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\w)")]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+")]
    private static partial Regex EmailPattern();
}
