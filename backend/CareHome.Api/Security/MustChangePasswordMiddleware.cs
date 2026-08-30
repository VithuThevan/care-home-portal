namespace CareHome.Api.Security;

public class MustChangePasswordMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && IsPasswordChangeRequired(context)
            && !IsAllowedWhilePasswordChangeRequired(context.Request.Path))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "You must change your temporary password before you can use the system."
            });
            return;
        }

        await next(context);
    }

    private static bool IsPasswordChangeRequired(HttpContext context)
    {
        return string.Equals(
            context.User.FindFirst(TenantClaimTypes.MustChangePassword)?.Value,
            "true",
            StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAllowedWhilePasswordChangeRequired(PathString path)
    {
        return path.StartsWithSegments("/api/auth/change-password")
            || path.StartsWithSegments("/api/auth/me");
    }
}
