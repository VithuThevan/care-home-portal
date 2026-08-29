using System.Security.Claims;
using CareHome.Api.Security;

namespace CareHome.Api.Common;

public class RequestLoggingScopeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ILogger<RequestLoggingScopeMiddleware> logger)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue(JwtRegisteredClaimNamesSafe.Sub);
        var tenantId = context.User.FindFirst(TenantClaimTypes.TenantId)?.Value;
        var endpoint = $"{context.Request.Method} {context.Request.Path}";

        using (logger.BeginScope(new Dictionary<string, object?>
        {
            ["UserId"] = userId,
            ["TenantId"] = tenantId,
            ["Endpoint"] = endpoint
        }))
        {
            await next(context);
            var status = context.Response.StatusCode;
            if (status >= 500)
            {
                logger.LogError(
                    "HTTP {Method} {Path} completed with {StatusCode}",
                    context.Request.Method,
                    context.Request.Path.Value,
                    status);
            }
            else if (status == StatusCodes.Status401Unauthorized || status == StatusCodes.Status403Forbidden)
            {
                logger.LogInformation(
                    "HTTP {Method} {Path} completed with {StatusCode}",
                    context.Request.Method,
                    context.Request.Path.Value,
                    status);
            }
        }
    }

    private static class JwtRegisteredClaimNamesSafe
    {
        public const string Sub = "sub";
    }
}
