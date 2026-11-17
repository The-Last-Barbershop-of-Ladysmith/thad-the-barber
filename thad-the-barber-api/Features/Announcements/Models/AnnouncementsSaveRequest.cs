using System.ComponentModel.DataAnnotations;

namespace ThadTheBarber.Api.Features.Announcements.Models;

/// <summary>The whole list, which replaces the file; an empty list clears every announcement.</summary>
public sealed record AnnouncementsSaveRequest(
    [Required, MaxLength(50)] List<AnnouncementInput> Items
);
