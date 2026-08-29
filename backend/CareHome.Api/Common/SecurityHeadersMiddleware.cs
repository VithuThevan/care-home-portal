namespace CareHome.Api.Common;

public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["X-Permitted-Cross-Domain-Policies"] = "none";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            // API-only CSP. The Angular host must set its own policy; see docs/PRODUCTION_CONFIGURATION.md.
            headers["Content-Security-Policy"] =
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
            return Task.CompletedTask;
        });

        await next(context);
    }
}
