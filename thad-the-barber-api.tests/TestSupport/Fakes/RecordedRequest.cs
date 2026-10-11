namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed record RecordedRequest(
    string Path,
    string Query,
    string? Token,
    string Body
);
