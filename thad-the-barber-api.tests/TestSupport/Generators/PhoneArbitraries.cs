using System.Globalization;
using FsCheck;
using FsCheck.Fluent;

namespace ThadTheBarber.Api.Tests.TestSupport.Generators;

/// <summary>7 to 15 digits (E.164's limit) with any mix of the separators people type between them.</summary>
public static class PhoneArbitraries
{
    private static readonly string[] separators =
    [
        "",
        " ",
        "-",
        ".",
        "(",
        ")",
        "+",
        "/",
    ];

    public static Arbitrary<FormattedPhone> FormattedPhones() => Arb.From(
        from length in Gen.Choose(7, 15)
        from digits in Gen.ArrayOf(Gen.Choose(0, 9), length)
        from gaps in Gen.ArrayOf(Gen.Elements(separators), length + 1)
        select new FormattedPhone(
            string.Concat(digits),
            string.Concat(gaps.Zip(digits, (gap, digit) => gap + digit.ToString(CultureInfo.InvariantCulture))) + gaps[^1]
        )
    );
}
