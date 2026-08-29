using Microsoft.Extensions.Primitives;

namespace CareHome.Api.Common;

public class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-ID";
    public const string ItemKey = "CorrelationId";

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var correlationId = Resolve(context.Request.Headers[HeaderName]);
        context.Items[ItemKey] = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<string, object?>
        {
            ["CorrelationId"] = correlationId
        }))
        {
            await next(context);
        }
    }

    public static string? Get(HttpContext context)
    {
        return context.Items[ItemKey] as string;
    }

    private static string Resolve(StringValues header)
    {
        var supplied = header.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(supplied) || supplied.Length > 64)
        {
            return Guid.NewGuid().ToString("N");
        }

        for (var i = 0; i < supplied.Length; i++)
        {
            var c = supplied[i];
            if (!char.IsLetterOrDigit(c) && c is not '-' and not '_')
            {
                return Guid.NewGuid().ToString("N");
            }
        }

        return supplied;
    }
}
