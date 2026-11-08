using System.Text.Json;
using ThadTheBarber.Api.Features.Reviews.Models;

namespace ThadTheBarber.Api.Features.Reviews.Mappers;

/// <summary>
/// Reads the owner's hand-edited <c>reviews.json</c>: <c>{ score, count, url, testimonials: [{ author, text, rating,
/// source }] }</c>. A file that isn't an object with a testimonials list is rejected; a testimonial without an author or
/// text is skipped, and a rating that isn't a score from 0 to 5 with a whole review count is left out.
/// </summary>
public static class ReviewsFileMapper
{
    private const int MaxStars = 5;
    private const string DefaultSource = "Customer review";

    public static ReviewsContent ToReviewsContent(this JsonElement file)
    {
        if (file.ValueKind != JsonValueKind.Object
            || !file.TryGetProperty("testimonials", out JsonElement entries)
            || entries.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException("reviews.json has no testimonials list.");
        }

        List<Review> testimonials = [];
        foreach (JsonElement entry in entries.EnumerateArray())
        {
            Review? testimonial = entry.ToReview(testimonials.Count);
            if (testimonial is not null)
            {
                testimonials.Add(testimonial);
            }
        }

        return new ReviewsContent(testimonials, file.ToRating());
    }

    private static Review? ToReview(this JsonElement entry, int index)
    {
        string? author = entry.ReadText("author");
        string? quote = entry.ReadText("text");
        if (author is null || quote is null)
        {
            return null;
        }

        int stars = entry.ReadInt("rating") ?? MaxStars;
        return new Review(
            Id: $"review-{index}",
            Quote: quote,
            Author: author,
            Source: entry.ReadText("source") ?? DefaultSource,
            Rating: stars is >= 1 and <= MaxStars ? stars : MaxStars
        );
    }

    private static ReviewRating? ToRating(this JsonElement file)
    {
        double? score = file.ReadDouble("score");
        int? count = file.ReadInt("count");
        if (score is null or < 0 or > MaxStars || count is null or < 0)
        {
            return null;
        }

        string? url = file.ReadText("url");
        bool isHttps = Uri.TryCreate(url, UriKind.Absolute, out Uri? link) && link.Scheme == Uri.UriSchemeHttps;
        return new ReviewRating(score.Value, count.Value, isHttps ? url : null);
    }

    private static string? ReadText(this JsonElement entry, string name)
    {
        if (entry.ValueKind != JsonValueKind.Object
            || !entry.TryGetProperty(name, out JsonElement value)
            || value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        string text = value.GetString()!.Trim();
        return text.Length == 0 ? null : text;
    }

    private static int? ReadInt(this JsonElement entry, string name)
    {
        if (entry.ValueKind != JsonValueKind.Object
            || !entry.TryGetProperty(name, out JsonElement value)
            || value.ValueKind != JsonValueKind.Number
            || !value.TryGetInt32(out int number))
        {
            return null;
        }

        return number;
    }

    private static double? ReadDouble(this JsonElement entry, string name)
    {
        if (entry.ValueKind != JsonValueKind.Object
            || !entry.TryGetProperty(name, out JsonElement value)
            || value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        return value.GetDouble();
    }
}
