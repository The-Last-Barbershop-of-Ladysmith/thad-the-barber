using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.TextMessages.Models;

/// <summary>The announcement as the admin form has it, so the message can be composed before it is sent.</summary>
public sealed record AnnouncementTextPreviewRequest(
    [Required, MaxLength(120)] string Title,
    [MaxLength(5000)] string? BodyHtml,
    [property: JsonRequired] DateOnly StartDate
);
