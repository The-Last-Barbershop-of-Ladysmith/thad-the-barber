using System.ComponentModel.DataAnnotations;
using ThadTheBarber.Api.Features.Contact.Models;

namespace ThadTheBarber.Api.Tests.Features.Contact.Models;

/// <summary>The rules between fields; each field's own length and format attributes are checked over HTTP in <c>ContactEndpointsTests</c>.</summary>
public sealed class ContactRequestTests
{
    private const string AnyMessage = "Made-up words about a made-up cut.";
    private const string AnyName = "Quillon Vey-Ashgrove";
    private const string AnyEmail = "quillon@example.test";
    private const string AnyPhone = "+15550100163";
    private const string AnyPage = "/book";

    [Fact]
    public void AFullQuestionPasses()
    {
        List<string> failedMembers = Check(new ContactRequest(ContactCategory.Question, AnyMessage, AnyName, AnyEmail, null, null));

        Assert.Empty(failedMembers);
    }

    [Fact]
    public void AQuestionWithOnlyAPhonePasses()
    {
        List<string> failedMembers = Check(new ContactRequest(ContactCategory.Question, AnyMessage, AnyName, null, AnyPhone, null));

        Assert.Empty(failedMembers);
    }

    [Theory]
    [InlineData(ContactCategory.Question)]
    [InlineData(ContactCategory.Issue)]
    public void AnAnswerableMessageWithoutANameFails(ContactCategory category)
    {
        List<string> failedMembers = Check(new ContactRequest(category, AnyMessage, "  ", AnyEmail, null, AnyPage));

        Assert.Equal([nameof(ContactRequest.Name)], failedMembers);
    }

    [Theory]
    [InlineData(ContactCategory.Question)]
    [InlineData(ContactCategory.Issue)]
    public void AnAnswerableMessageWithoutAnEmailOrPhoneFails(ContactCategory category)
    {
        List<string> failedMembers = Check(new ContactRequest(category, AnyMessage, AnyName, null, null, AnyPage));

        Assert.Equal([nameof(ContactRequest.Email), nameof(ContactRequest.Phone)], failedMembers);
    }

    [Fact]
    public void AnIssueWithoutAPageOrBookingFails()
    {
        List<string> failedMembers = Check(new ContactRequest(ContactCategory.Issue, AnyMessage, AnyName, AnyEmail, null, null));

        Assert.Equal([nameof(ContactRequest.PageOrBooking)], failedMembers);
    }

    [Fact]
    public void AnIssueWithAPageOrBookingPasses()
    {
        List<string> failedMembers = Check(new ContactRequest(ContactCategory.Issue, AnyMessage, AnyName, null, AnyPhone, AnyPage));

        Assert.Empty(failedMembers);
    }

    [Fact]
    public void AnonymousFeedbackPasses()
    {
        List<string> failedMembers = Check(new ContactRequest(ContactCategory.Feedback, AnyMessage, null, null, null, null));

        Assert.Empty(failedMembers);
    }

    private static List<string> Check(ContactRequest request)
    {
        return [.. request.Validate(new ValidationContext(request)).SelectMany(result => result.MemberNames)];
    }
}
