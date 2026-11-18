using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using ThadTheBarber.Api.Features.Admin.Models;
using ThadTheBarber.Api.Features.Admin.Services;
using ThadTheBarber.Api.Infrastructure.Headers.Middleware;
using ThadTheBarber.Api.Infrastructure.RateLimiting.Configuration;

namespace ThadTheBarber.Api.Features.Admin.Endpoints;

public static class AdminEndpoints
{
    public const string AdminPolicy = "Admin";

    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder api)
    {
        // Behind the visitor session token like every other call; it is how an admin session is started, so it
        // can't itself need the Admin policy. It shares the session policy's per-IP limit.
        api.MapPost("/admin/session", SignInAsync)
            .WithName("StartAdminSession")
            .WithTags("Admin")
            .RequireRateLimiting(RateLimitSetup.SessionPolicy)
            .NoStore();

        // Also behind the visitor session token only: the sign-in page asks for it before anyone is signed in.
        api.MapGet("/admin/config", GetConfig)
            .WithName("GetAdminConfig")
            .WithTags("Admin")
            .NoStore();

        RouteGroupBuilder admin = api.MapGroup("/admin").RequireAuthorization(AdminPolicy).WithTags("Admin");
        admin.MapGet("/me", GetProfile)
            .WithName("GetAdminProfile")
            .NoStore();
        return api;
    }

    /// <summary>
    /// An admin session for a Google account on the allowlist; 401 <c>invalid_id_token</c>, 403 <c>not_authorized</c>
    /// or 503 <c>admin_unavailable</c> otherwise.
    /// </summary>
    internal static async Task<Ok<AdminSession>> SignInAsync(
        AdminSessionRequest? request,
        AdminService admin,
        CancellationToken cancellationToken) =>
        TypedResults.Ok(await admin.SignInAsync(request?.IdToken, cancellationToken));

    /// <summary>The OAuth client ID for Google's button, or 503 <c>admin_unavailable</c> while sign-in isn't set up.</summary>
    internal static Ok<AdminConfig> GetConfig(AdminService admin) =>
        TypedResults.Ok(admin.GetConfig());

    internal static Ok<AdminProfile> GetProfile(ClaimsPrincipal user) =>
        TypedResults.Ok(new AdminProfile(
            user.FindFirstValue("email") ?? string.Empty,
            user.FindFirstValue("name")
        ));
}
