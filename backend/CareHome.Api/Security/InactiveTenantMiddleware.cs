using CareHome.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Security;

public class InactiveTenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, CareHomeDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantValue = context.User.FindFirst(TenantClaimTypes.TenantId)?.Value;
            if (int.TryParse(tenantValue, out var tenantId) && tenantId > 0)
            {
                var active = await dbContext.Tenants.AsNoTracking()
                    .Where(x => x.Id == tenantId)
                    .Select(x => (bool?)x.IsActive)
                    .FirstOrDefaultAsync(context.RequestAborted);

                if (active != true)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "This organisation is not available."
                    });
                    return;
                }
            }
        }

        await next(context);
    }
}
