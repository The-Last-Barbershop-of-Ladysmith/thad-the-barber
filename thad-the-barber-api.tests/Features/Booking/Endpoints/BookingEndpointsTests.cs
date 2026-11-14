using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Time.Testing;
using ThadTheBarber.Api.Square.Models;
using ThadTheBarber.Api.Tests.TestSupport;
using ThadTheBarber.Api.Tests.TestSupport.Fakes;
using ThadTheBarber.Api.Twilio.Exceptions;

namespace ThadTheBarber.Api.Tests.Features.Booking.Endpoints;

/// <summary>The clock sits at 11:10 shop time (America/New_York) on 2026-10-06; see <c>AvailabilityServiceTests</c>.</summary>
public sealed class BookingEndpointsTests
{
    private const string Now = "2026-10-06T15:10:00Z";
    private const string LookupPhone = "+15555550123";

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    [Fact]
    public async Task AvailabilityListsOpenDaysAsIsoDatesWithUtcTimes()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?from=2026-10-01&to=2026-10-31", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement days = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(4, days.GetArrayLength());
        Assert.Equal("2026-10-06", days[0].GetProperty("date").GetString());
        Assert.Equal("2026-10-06T15:30:00+00:00", days[0].GetProperty("times")[0].GetString());
    }

    [Fact]
    public async Task AvailabilityIncludesTheLastDay()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?from=2026-10-07&to=2026-10-08", Cancellation);

        JsonElement days = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(
            [
                "2026-10-07",
                "2026-10-08",
            ],
            days.EnumerateArray().Select(day => day.GetProperty("date").GetString()));
    }

    [Fact]
    public async Task AvailabilityIsNeverStored()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?from=2026-10-01&to=2026-10-31", Cancellation);

        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("from=2026-10&to=2026-10-31", "from")]
    [InlineData("from=2026-10-1&to=2026-10-31", "from")]
    [InlineData("from=2026-13-01&to=2026-10-31", "from")]
    [InlineData("from=0001-01-01&to=0001-01-02", "from")]
    [InlineData("from=2026-10-01&to=31-10-2026", "to")]
    [InlineData("from=9999-12-01&to=9999-12-31", "from")]
    [InlineData("from=2026-10-02&to=2026-10-01", "to")]
    [InlineData("from=2026-10-01&to=2026-11-01", "to")]
    public async Task AMalformedOrTooLongRangeIs400ForTheField(string query, string field)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync($"/api/bookings/availability?{query}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _));
    }

    [Fact]
    public async Task ThirtyOneDaysIsTheLongestRange()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync("/api/bookings/availability?from=2026-10-01&to=2026-10-31", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("availability?to=2026-10-31")]
    [InlineData("availability?from=2026-10-01")]
    public async Task AMissingDayIs400(string path)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync($"/api/bookings/{path}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("from=2026-09-01&to=2026-09-30")]
    [InlineData("from=2027-11-01&to=2027-11-30")]
    public async Task ARangeOutsideTheBookingWindowIs400WithItsCode(string query)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().GetAsync($"/api/bookings/availability?{query}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("outside_booking_window", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task NextTimesListsTheFirstOpenTimesAsUtcInstantsWithoutAToken()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync("/api/bookings/next?count=3", Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement times = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(3, times.GetArrayLength());
        Assert.Equal("2026-10-06T15:30:00+00:00", times[0].GetString());
    }

    [Theory]
    [InlineData("count=0")]
    [InlineData("count=13")]
    [InlineData("count=-1")]
    [InlineData("count=six")]
    [InlineData("")]
    public async Task ANextTimesCountOutsideOneToTwelveIs400(string query)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClientWithoutToken().GetAsync($"/api/bookings/next?{query}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ABookingIs201WithOnlyItsIdUtcStartAndManageToken()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement confirmation = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(
            [
                "id",
                "manageToken",
                "startAt",
            ],
            confirmation.EnumerateObject().Select(property => property.Name).Order());
        Assert.Equal("2026-10-07T13:30:00+00:00", confirmation.GetProperty("startAt").GetString());
        Assert.True(ManageTokens.Signer.IsValid(confirmation.GetProperty("id").GetString()!, confirmation.GetProperty("manageToken").GetString()));
    }

    [Fact]
    public async Task ATakenTimeIs409WithItsCode()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        using HttpResponseMessage booked = await client.PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        using HttpResponseMessage response = await client.PostAsJsonAsync("/api/bookings", BookingBody(phone: "+15550100142"), Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("slot_unavailable", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task APhoneAtItsUpcomingAppointmentLimitIs409WithItsCode()
    {
        FakeSquareService square = new();
        square.Hold(6, AppointmentStatus.Accepted, DateTimeOffset.Parse("2026-10-30T14:00:00Z", CultureInfo.InvariantCulture));
        using ApiFactory api = Api(square);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status409Conflict, "booking_limit");
        Assert.Equal(6, square.Bookings.Count);
    }

    [Fact]
    public async Task TheSameAttemptTwiceBooksOnceAndConfirmsBoth()
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        HttpClient client = api.CreateClient();
        Dictionary<string, object?> body = BookingBody();

        using HttpResponseMessage first = await client.PostAsJsonAsync("/api/bookings", body, Cancellation);
        using HttpResponseMessage retried = await client.PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.Created, retried.StatusCode);
        Assert.Equal(await first.Content.ReadAsStringAsync(Cancellation), await retried.Content.ReadAsStringAsync(Cancellation));
        Assert.Single(square.Bookings);
    }

    [Theory]
    [InlineData("name", "J")]
    [InlineData("name", "")]
    [InlineData("name", null)]
    [InlineData("phone", "(555) 010-0187")]
    [InlineData("phone", "5550100187")]
    [InlineData("phone", "+1555010018")]
    [InlineData("phone", "+155501001870")]
    [InlineData("phone", "+445550100187")]
    [InlineData("phone", "+15550100187\n")]
    [InlineData("phone", null)]
    public async Task AnInvalidNameOrPhoneIs400ForThatFieldAndBooksNothing(string field, string? value)
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        Dictionary<string, object?> body = BookingBody();
        body[field] = value;

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal([field], problem.GetProperty("errors").EnumerateObject().Select(error => error.Name.ToLowerInvariant()));
        Assert.Empty(square.Bookings);
    }

    [Theory]
    [InlineData(250, HttpStatusCode.Created)]
    [InlineData(251, HttpStatusCode.BadRequest)]
    public async Task ANameIsAtMost250Characters(int length, HttpStatusCode expected)
    {
        using ApiFactory api = Api();
        Dictionary<string, object?> body = BookingBody();
        body["name"] = new string('Q', length);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task AnUnknownFieldIs400AndBooksNothing()
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        Dictionary<string, object?> body = BookingBody();
        body["email"] = "q.testperson@example.test";

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status400BadRequest, "bad_request");
        Assert.Empty(square.Bookings);
    }

    [Theory]
    [InlineData("startAt")]
    [InlineData("idempotencyKey")]
    public async Task AMissingStartOrIdempotencyKeyIs400(string field)
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);
        Dictionary<string, object?> body = BookingBody();
        body.Remove(field);

        using HttpResponseMessage response = await api.CreateClient().PostAsJsonAsync("/api/bookings", body, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(square.Bookings);
    }

    [Fact]
    public async Task BookingWithoutASessionTokenIs401AndBooksNothing()
    {
        FakeSquareService square = new();
        using ApiFactory api = Api(square);

        using HttpResponseMessage response = await api.CreateClientWithoutToken().PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(square.Bookings);
    }

    [Fact]
    public async Task AManagedBookingIs200WithOnlyItsTimeAndStatus()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);

        using HttpResponseMessage response = await client.SendAsync(ManageRequest(HttpMethod.Get, $"/api/bookings/{id}", manageToken), Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement booking = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(
            [
                "canChange",
                "id",
                "isCancelled",
                "startAt",
            ],
            booking.EnumerateObject().Select(property => property.Name).Order());
        Assert.True(booking.GetProperty("canChange").GetBoolean());
    }

    [Theory]
    [InlineData("GET", "")]
    [InlineData("POST", "/cancel")]
    [InlineData("POST", "/reschedule")]
    public async Task AMissingOrWrongTokenIs404WithItsCode(string method, string action)
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);
        string?[] badTokens =
        [
            null,
            ManageTokens.Signer.Sign("bk_test-other1"),
            manageToken.ToUpperInvariant(),
        ];

        foreach (string? badToken in badTokens)
        {
            using HttpRequestMessage request = ManageRequest(new HttpMethod(method), $"/api/bookings/{id}{action}", badToken, new { startAt = "2026-10-08T14:00:00Z" });
            using HttpResponseMessage response = await client.SendAsync(request, Cancellation);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
            Assert.Equal("booking_not_found", problem.GetProperty("code").GetString());
        }
    }

    [Theory]
    [InlineData("manageToken")]
    [InlineData("X-Manage-Token")]
    [InlineData("t")]
    public async Task ATokenInTheQueryStringIsIgnored(string parameter)
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);

        using HttpResponseMessage response = await client.GetAsync($"/api/bookings/{id}?{parameter}={manageToken}", Cancellation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CancellingIs200AndShowsTheBookingCancelled()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);

        using HttpResponseMessage response = await client.SendAsync(ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/cancel", manageToken), Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement booking = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.True(booking.GetProperty("isCancelled").GetBoolean());
        Assert.False(booking.GetProperty("canChange").GetBoolean());
    }

    [Fact]
    public async Task ReschedulingIs200WithTheNewUtcStart()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);
        using HttpRequestMessage request = ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/reschedule", manageToken, new { startAt = "2026-10-08T14:00:00Z" });

        using HttpResponseMessage response = await client.SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonElement booking = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("2026-10-08T14:00:00+00:00", booking.GetProperty("startAt").GetString());
    }

    [Fact]
    public async Task ReschedulingToATakenTimeIs409SlotUnavailable()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);
        using HttpResponseMessage taken = await client.PostAsJsonAsync("/api/bookings", BookingBody(startAt: "2026-10-08T14:00:00Z"), Cancellation);
        using HttpRequestMessage request = ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/reschedule", manageToken, new { startAt = "2026-10-08T14:00:00Z" });

        using HttpResponseMessage response = await client.SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("slot_unavailable", problem.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("/cancel")]
    [InlineData("/reschedule")]
    public async Task ChangingAStartedBookingIs409BookingStarted(string action)
    {
        FakeTimeProvider time = new(DateTimeOffset.Parse(Now, CultureInfo.InvariantCulture));
        using ApiFactory api = new(time: time);
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);
        time.SetUtcNow(DateTimeOffset.Parse("2026-10-07T13:30:00Z", CultureInfo.InvariantCulture));
        using HttpRequestMessage request = ManageRequest(HttpMethod.Post, $"/api/bookings/{id}{action}", manageToken, new { startAt = "2026-10-08T14:00:00Z" });

        using HttpResponseMessage response = await client.SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("booking_started", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ReschedulingACancelledBookingIs409BookingCancelled()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);
        using HttpResponseMessage cancelled = await client.SendAsync(ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/cancel", manageToken), Cancellation);
        using HttpRequestMessage request = ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/reschedule", manageToken, new { startAt = "2026-10-08T14:00:00Z" });

        using HttpResponseMessage response = await client.SendAsync(request, Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        JsonElement problem = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal("booking_cancelled", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ARescheduleWithoutANewTimeIs400()
    {
        using ApiFactory api = Api();
        HttpClient client = api.CreateClient();
        (string id, string manageToken) = await BookAsync(client);

        using HttpResponseMessage response = await client.SendAsync(ManageRequest(HttpMethod.Post, $"/api/bookings/{id}/reschedule", manageToken, new { }), Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task StartIs202WithNoBodyForAPhoneWithBookings()
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"));
        FakeTwilioVerifyService twilio = new();
        using ApiFactory api = Api(square, twilio);

        using HttpResponseMessage response = await StartLookupAsync(api.CreateClient(), LookupPhone);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync(Cancellation));
        Assert.Equal([LookupPhone], twilio.StartedPhones);
    }

    [Fact]
    public async Task StartLooksTheSameForAPhoneWithNoBookings()
    {
        FakeSquareService withBookings = new();
        withBookings.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"));
        FakeSquareService unknownPhone = new()
        {
            CustomerId = null,
        };
        using ApiFactory known = Api(withBookings);
        using ApiFactory unknown = Api(unknownPhone);

        using HttpResponseMessage knownResponse = await StartLookupAsync(known.CreateClient(), LookupPhone);
        using HttpResponseMessage unknownResponse = await StartLookupAsync(unknown.CreateClient(), LookupPhone);

        Assert.Equal(knownResponse.StatusCode, unknownResponse.StatusCode);
        Assert.Equal(
            knownResponse.Headers.Select(header => header.Key).Order(),
            unknownResponse.Headers.Select(header => header.Key).Order());
        Assert.Equal(await knownResponse.Content.ReadAsStringAsync(Cancellation), await unknownResponse.Content.ReadAsStringAsync(Cancellation));
    }

    [Theory]
    [InlineData("")]
    [InlineData("5555550123")]
    [InlineData("+1555555012")]
    [InlineData("+25555550123")]
    [InlineData("+1555555O123")]
    public async Task StartRejectsAPhoneThatIsNotE164WithAUsNumber(string phone)
    {
        FakeTwilioVerifyService twilio = new();
        using ApiFactory api = Api(twilio: twilio);

        using HttpResponseMessage response = await StartLookupAsync(api.CreateClient(), phone);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status400BadRequest, "validation_failed");
        Assert.Empty(twilio.StartedPhones);
    }

    [Fact]
    public async Task StartNeedsASessionToken()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await StartLookupAsync(api.CreateClientWithoutToken(), LookupPhone);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AFourthCodeForOnePhoneIs429WithRetryAfter()
    {
        FakeTwilioVerifyService twilio = new();
        using ApiFactory api = Api(twilio: twilio);
        using HttpClient client = api.CreateClient();
        for (int attempt = 0; attempt < 3; attempt++)
        {
            using HttpResponseMessage allowed = await StartLookupAsync(client, LookupPhone);
            Assert.Equal(HttpStatusCode.Accepted, allowed.StatusCode);
        }

        using HttpResponseMessage refused = await StartLookupAsync(client, LookupPhone);

        await ProblemAssert.IsProblemAsync(refused, StatusCodes.Status429TooManyRequests, "rate_limited");
        Assert.InRange(refused.Headers.RetryAfter!.Delta!.Value, TimeSpan.FromSeconds(1), TimeSpan.FromMinutes(10));
        Assert.Equal(3, twilio.StartedPhones.Count);
    }

    [Fact]
    public async Task AFailingTwilioIs503OnStart()
    {
        FakeTwilioVerifyService twilio = new()
        {
            Failure = new TwilioRequestFailedException(StatusCodes.Status500InternalServerError, null),
        };
        using ApiFactory api = Api(twilio: twilio);

        using HttpResponseMessage response = await StartLookupAsync(api.CreateClient(), LookupPhone);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status503ServiceUnavailable, "verification_unavailable");
    }

    [Fact]
    public async Task VerifyListsOnlyIdStartAndManageTokenSoonestFirst()
    {
        FakeSquareService square = new();
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-11-03T14:00:00Z"));
        square.Hold(1, AppointmentStatus.Accepted, Instant("2026-10-20T14:00:00Z"));
        square.Hold(1, AppointmentStatus.CancelledByCustomer, Instant("2026-10-10T14:00:00Z"));
        using ApiFactory api = Api(square);
        using HttpClient client = api.CreateClient();
        (await StartLookupAsync(client, LookupPhone)).Dispose();

        using HttpResponseMessage response = await VerifyLookupAsync(client, LookupPhone, FakeTwilioVerifyService.ApprovedCode);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        JsonElement found = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        Assert.Equal(
            [
                "2026-10-20T14:00:00+00:00",
                "2026-11-03T14:00:00+00:00",
            ],
            found.EnumerateArray().Select(booking => booking.GetProperty("startAt").GetString()));
        Assert.All(found.EnumerateArray(), booking =>
        {
            Assert.Equal(
                [
                    "id",
                    "startAt",
                    "manageToken",
                ],
                booking.EnumerateObject().Select(property => property.Name));
            Assert.True(ManageTokens.Signer.IsValid(booking.GetProperty("id").GetString()!, booking.GetProperty("manageToken").GetString()));
        });
    }

    [Fact]
    public async Task VerifyForAPhoneWithNoBookingsIsAnEmptyList()
    {
        FakeSquareService square = new()
        {
            CustomerId = null,
        };
        using ApiFactory api = Api(square);
        using HttpClient client = api.CreateClient();
        (await StartLookupAsync(client, LookupPhone)).Dispose();

        using HttpResponseMessage response = await VerifyLookupAsync(client, LookupPhone, FakeTwilioVerifyService.ApprovedCode);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, (await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation)).GetArrayLength());
    }

    [Fact]
    public async Task VerifyWithAWrongCodeIs400CodeInvalid()
    {
        using ApiFactory api = Api();
        using HttpClient client = api.CreateClient();
        (await StartLookupAsync(client, LookupPhone)).Dispose();

        using HttpResponseMessage response = await VerifyLookupAsync(client, LookupPhone, "000000");

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status400BadRequest, "code_invalid");
    }

    [Theory]
    [InlineData("+15555550123", "")]
    [InlineData("+15555550123", "123")]
    [InlineData("+15555550123", "12345678901")]
    [InlineData("+15555550123", "12ab56")]
    [InlineData("5555550123", "123456")]
    public async Task VerifyRejectsAMalformedPhoneOrCode(string phone, string code)
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await VerifyLookupAsync(api.CreateClient(), phone, code);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status400BadRequest, "validation_failed");
    }

    [Fact]
    public async Task AFailingTwilioIs503OnVerify()
    {
        FakeTwilioVerifyService twilio = new()
        {
            Failure = new TwilioRequestFailedException(0, null),
        };
        using ApiFactory api = Api(twilio: twilio);

        using HttpResponseMessage response = await VerifyLookupAsync(api.CreateClient(), LookupPhone, FakeTwilioVerifyService.ApprovedCode);

        await ProblemAssert.IsProblemAsync(response, StatusCodes.Status503ServiceUnavailable, "verification_unavailable");
    }

    [Fact]
    public async Task VerifyNeedsASessionToken()
    {
        using ApiFactory api = Api();

        using HttpResponseMessage response = await VerifyLookupAsync(api.CreateClientWithoutToken(), LookupPhone, FakeTwilioVerifyService.ApprovedCode);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static Task<HttpResponseMessage> StartLookupAsync(HttpClient client, string phone) =>
        client.PostAsJsonAsync("/api/bookings/lookup/start", new { phone }, Cancellation);

    private static Task<HttpResponseMessage> VerifyLookupAsync(HttpClient client, string phone, string code) =>
        client.PostAsJsonAsync("/api/bookings/lookup/verify", new { phone, code }, Cancellation);

    private static DateTimeOffset Instant(string instant) => DateTimeOffset.Parse(instant, CultureInfo.InvariantCulture);

    private static async Task<(string Id, string ManageToken)> BookAsync(HttpClient client)
    {
        using HttpResponseMessage response = await client.PostAsJsonAsync("/api/bookings", BookingBody(), Cancellation);
        JsonElement confirmation = await response.Content.ReadFromJsonAsync<JsonElement>(Cancellation);
        return (confirmation.GetProperty("id").GetString()!, confirmation.GetProperty("manageToken").GetString()!);
    }

    private static HttpRequestMessage ManageRequest(HttpMethod method, string path, string? manageToken, object? body = null)
    {
        HttpRequestMessage request = new(method, path);
        if (manageToken is not null)
        {
            request.Headers.Add("X-Manage-Token", manageToken);
        }

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private static Dictionary<string, object?> BookingBody(string phone = "+15550100187", string startAt = "2026-10-07T13:30:00Z") => new()
    {
        ["startAt"] = startAt,
        ["name"] = "Q Testperson-Example",
        ["phone"] = phone,
        ["idempotencyKey"] = Guid.NewGuid(),
    };

    private static ApiFactory Api(FakeSquareService? square = null, FakeTwilioVerifyService? twilio = null) => new(
        square: square,
        twilio: twilio,
        time: new FakeTimeProvider(DateTimeOffset.Parse(Now, CultureInfo.InvariantCulture))
    );
}
