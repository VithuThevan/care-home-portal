using CareHome.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CareHome.Api.Common;

public class SqlReadyHealthCheck(IServiceScopeFactory scopes) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CareHomeDbContext>();
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Database is not reachable.");
        }
        catch (Exception)
        {
            return HealthCheckResult.Unhealthy("Database is not reachable.");
        }
    }
}
