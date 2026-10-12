using System.Collections.Frozen;
using System.Text.RegularExpressions;

namespace ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

public static partial class StringRedactionExtensions
{
    public const string PhonePlaceholder = "[phone]";
    public const string EmailPlaceholder = "[email]";
    public const string BodyPlaceholder = "Body: [removed]";
    public const string ValuePlaceholder = "[redacted]";

    /// <summary>Compared after lowercasing and dropping <c>_</c>, <c>-</c> and <c>.</c>, so <c>customer.name</c> and <c>given_name</c> match.</summary>
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
    /// Masks phone numbers and email addresses and drops HTTP response bodies, which SDKs like Square's put in exception
    /// messages and which echo customers' names and phones back (BR-23). Names have no shape to find in free text; they're
    /// caught by their field name instead (<see cref="IsPersonalDataKey"/>).
    /// </summary>
    public static string Redact(this string text)
    {
        string withoutBody = ResponseBodyPattern().Replace(text, BodyPlaceholder);
        string withoutEmails = EmailPattern().Replace(withoutBody, EmailPlaceholder);
        return PhonePattern().Replace(withoutEmails, PhonePlaceholder);
    }

    /// <summary>
    /// Whether a log attribute or span tag named this holds a name, phone or email. Whole keys only, so tags like
    /// <c>db.name</c> or <c>service.name</c> keep their values.
    /// </summary>
    public static bool IsPersonalDataKey(this string key) =>
        PersonalDataKeys.Contains(KeySeparatorPattern().Replace(key, string.Empty).ToLowerInvariant());

    /// <summary>
    /// A US number with or without +1, bare or with spaces, dots, dashes or brackets, and not part of a longer number
    /// or id, so dates, GUIDs, trace ids and Square ids are left alone.
    /// </summary>
    [GeneratedRegex(@"(?<![\w+])(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\w)")]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")]
    private static partial Regex EmailPattern();

    [GeneratedRegex(@"^Body:.*\z", RegexOptions.Multiline | RegexOptions.Singleline)]
    private static partial Regex ResponseBodyPattern();

    [GeneratedRegex(@"[_.\-]")]
    private static partial Regex KeySeparatorPattern();
}
