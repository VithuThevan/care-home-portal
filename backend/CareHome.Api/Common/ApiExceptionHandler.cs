using Microsoft.AspNetCore.Diagnostics;

namespace CareHome.Api.Common;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var correlationId = CorrelationIdMiddleware.Get(httpContext) ?? httpContext.TraceIdentifier;
        logger.LogError(
            exception,
            "Unhandled exception for {Method} {Path} CorrelationId={CorrelationId}",
            httpContext.Request.Method,
            httpContext.Request.Path.Value,
            correlationId);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new
        {
            message = "An unexpected error occurred. Please try again or contact support.",
            correlationId
        }, cancellationToken);
        return true;
    }
}
