using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ThadTheBarber.Api.Features.Shop.Models;

/// <summary>The notice text (blank to use Square's description) and whether it shows; saving replaces what was saved.</summary>
public sealed record ShopInfoSaveRequest(
    [MaxLength(1000)] string? Notice,
    [property: JsonRequired] bool IsNoticeShown
);
