namespace ThadTheBarber.Api.Tests.Fakes;

public sealed record RecordedRequest(
    string Path,
    string? Token,
    string Body
);
