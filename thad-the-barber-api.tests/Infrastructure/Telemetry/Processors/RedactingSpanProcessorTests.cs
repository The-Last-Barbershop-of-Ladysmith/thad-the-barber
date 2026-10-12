using System.Diagnostics;
using ThadTheBarber.Api.Infrastructure.Telemetry.Processors;

namespace ThadTheBarber.Api.Tests.Infrastructure.Telemetry.Processors;

public sealed class RedactingSpanProcessorTests
{
    [Fact]
    public void NamePhoneAndEmailTagsLoseTheirValue()
    {
        using Activity span = new Activity("POST /api/bookings")
            .SetTag("customer.name", "Quillon Vey-Ashgrove")
            .SetTag("phone_number", "+15550100163")
            .SetTag("email", "q.vey@example.com");

        new RedactingSpanProcessor().OnEnd(span);

        Assert.Equal("[redacted]", span.GetTagItem("customer.name"));
        Assert.Equal("[redacted]", span.GetTagItem("phone_number"));
        Assert.Equal("[redacted]", span.GetTagItem("email"));
    }

    [Fact]
    public void PhonesInUrlsAndNamesAreMasked()
    {
        using Activity span = new Activity("lookup")
            .SetTag("url.full", "https://api.example.com/v2/customers?phone=+15550100163");
        span.DisplayName = "GET customer +15550100163";

        new RedactingSpanProcessor().OnEnd(span);

        Assert.Equal("https://api.example.com/v2/customers?phone=[phone]", span.GetTagItem("url.full"));
        Assert.Equal("GET customer [phone]", span.DisplayName);
    }

    [Fact]
    public void OtherTagsAreLeftAlone()
    {
        using Activity span = new Activity("GET /api/shop")
            .SetTag("http.route", "/api/shop")
            .SetTag("db.name", "shop")
            .SetTag("http.response.status_code", 200);

        new RedactingSpanProcessor().OnEnd(span);

        Assert.Equal("/api/shop", span.GetTagItem("http.route"));
        Assert.Equal("shop", span.GetTagItem("db.name"));
        Assert.Equal(200, span.GetTagItem("http.response.status_code"));
    }
}
