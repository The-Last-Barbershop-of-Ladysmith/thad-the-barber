namespace ThadTheBarber.Api.Tests.TestSupport.Generators;

public sealed record ZonedDate(
    TimeZoneInfo TimeZone,
    DateOnly Date
)
{
    public override string ToString() => $"{Date:yyyy-MM-dd} in {TimeZone.Id}";
}
