namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed record RecordedRequest(
    string Path,
    string? Token,
    string Body
);
