using ThadTheBarber.Api.Infrastructure.Telemetry.Extensions;

namespace ThadTheBarber.Api.Tests.Infrastructure.Telemetry.Extensions;

public sealed class StringRedactionExtensionsTests
{
    [Theory]
    [InlineData("call +15550100163 now", "call [phone] now")]
    [InlineData("call 5550100163", "call [phone]")]
    [InlineData("call (555) 010-0163", "call [phone]")]
    [InlineData("call 555-010-0163", "call [phone]")]
    [InlineData("call 555.010.0163", "call [phone]")]
    [InlineData("call +1 555 010 0163", "call [phone]")]
    [InlineData("{\"phone\":\"+15550100163\"}", "{\"phone\":\"[phone]\"}")]
    public void PhoneNumbersAreMasked(string text, string expected)
    {
        Assert.Equal(expected, text.Redact());
    }

    [Theory]
    [InlineData("write to q.vey+ashgrove@example.com today", "write to [email] today")]
    [InlineData("q_vey@mail.example.co.uk", "[email]")]
    public void EmailAddressesAreMasked(string text, string expected)
    {
        Assert.Equal(expected, text.Redact());
    }

    [Theory]
    [InlineData("2026-10-07T13:30:00Z")]
    [InlineData("4bf92f3577b34da6a3ce929d0e0e4736")]
    [InlineData("d3c0249a-5e16-4c1b-9d0f-55501001634a")]
    [InlineData("BKG7Q2X5550100163ZZ")]
    [InlineData("55501001631")]
    [InlineData("198.51.100.7")]
    [InlineData("Returned 409 slot_unavailable.")]
    public void OtherValuesAreLeftAlone(string text)
    {
        Assert.Equal(text, text.Redact());
    }

    [Theory]
    [InlineData("name")]
    [InlineData("Name")]
    [InlineData("firstName")]
    [InlineData("last_name")]
    [InlineData("given_name")]
    [InlineData("familyName")]
    [InlineData("customer.name")]
    [InlineData("phone")]
    [InlineData("phone_number")]
    [InlineData("Email")]
    [InlineData("email-address")]
    public void NamePhoneAndEmailKeysArePersonalData(string key)
    {
        Assert.True(key.IsPersonalDataKey());
    }

    [Theory]
    [InlineData("db.name")]
    [InlineData("service.name")]
    [InlineData("http.route")]
    [InlineData("{OriginalFormat}")]
    [InlineData("Code")]
    [InlineData("nameserver")]
    public void OtherKeysAreNot(string key)
    {
        Assert.False(key.IsPersonalDataKey());
    }
}
