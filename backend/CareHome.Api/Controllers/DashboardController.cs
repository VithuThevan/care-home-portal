using CareHome.Api.Data;
using CareHome.Api.Dtos.Dashboard;
using CareHome.Api.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [RequireTenant]
    public class DashboardController(
        CareHomeDbContext dbContext,
        UserAccessService userAccess,
        ITenantContext tenantContext) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<DashboardDto>> GetDashboard()
        {
            var homes = await userAccess.GetScopedCareHomeIdsAsync(tenantContext.TenantId);
            var queryHomes = dbContext.CareHomes.AsNoTracking().Where(x => homes.Contains(x.Id));

            var capacity = await queryHomes.SumAsync(x => x.BedCapacity);
            var occupied = await dbContext.Clients.CountAsync(x =>
                homes.Contains(x.CareHomeId) && x.Status == "Current" && !x.IsArchived);

            var occupancy = await queryHomes.Select(x => new OccupancyCardDto
            {
                CareHomeId = x.Id,
                CareHomeName = x.Name,
                Capacity = x.BedCapacity,
                Occupied = x.Clients.Count(c => c.Status == "Current" && !c.IsArchived),
                Available = x.BedCapacity - x.Clients.Count(c => c.Status == "Current" && !c.IsArchived)
            }).ToListAsync();

            var outstanding = dbContext.Invoices.AsNoTracking()
                .Where(x => homes.Contains(x.CareHomeId) && x.Status != "Void" && x.PaymentStatus != "Paid");

            var recent = await dbContext.Invoices.AsNoTracking()
                .Where(x => homes.Contains(x.CareHomeId))
                .OrderByDescending(x => x.GeneratedAt)
                .Take(8)
                .Select(x => new RecentInvoiceDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    CareHomeName = x.SnapshotCareHomeName,
                    TotalAmount = x.TotalAmount,
                    Status = x.Status
                })
                .ToListAsync();

            var exceptions = await dbContext.BillingExceptionLogs.AsNoTracking()
                .Where(x => x.TenantId == tenantContext.TenantId)
                .Where(x => x.CareHomeId == null || homes.Contains(x.CareHomeId.Value))
                .OrderByDescending(x => x.LoggedAt)
                .Take(8)
                .Select(x => x.Message)
                .ToListAsync();

            var upcoming = await dbContext.ClientFundingContracts.AsNoTracking()
                .Where(x => homes.Contains(x.Client.CareHomeId) && x.Status == "Active")
                .Select(x => new UpcomingInvoiceDto
                {
                    CareHomeName = x.Client.CareHome.Name,
                    FundingAuthorityName = x.FundingAuthority.Name,
                    BillingFrequency = x.FundingAuthority.BillingFrequency
                })
                .Distinct()
                .Take(12)
                .ToListAsync();

            return Ok(new DashboardDto
            {
                TotalCareHomes = await queryHomes.CountAsync(x => x.IsActive),
                CurrentClients = occupied,
                AvailableBeds = capacity - occupied,
                UpcomingBillingCount = upcoming.Count,
                OutstandingInvoices = await outstanding.CountAsync(),
                OutstandingAmount = await outstanding.SumAsync(x => (decimal?)x.TotalAmount) ?? 0,
                InvoicesGenerated = await dbContext.Invoices.CountAsync(x =>
                    x.TenantId == tenantContext.TenantId && homes.Contains(x.CareHomeId) && x.Status != "Void"),
                OccupancyByHome = occupancy,
                RecentInvoices = recent,
                BillingExceptions = exceptions,
                UpcomingInvoices = upcoming,
                SetupHints = await BuildSetupHints(tenantContext.TenantId)
            });
        }

        [HttpGet("care-homes/{id:int}")]
        public async Task<ActionResult<CareHomeDashboardDto>> GetCareHomeDashboard(int id)
        {
            if (!await userAccess.CanAccessCareHomeAsync(tenantContext.TenantId, id))
            {
                return Forbid();
            }

            var home = await dbContext.CareHomes.AsNoTracking()
                .Include(x => x.Clients)
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenantContext.TenantId);

            if (home is null)
            {
                return NotFound();
            }

            var occupied = home.Clients.Count(c => c.Status == "Current" && !c.IsArchived);
            var outstanding = dbContext.Invoices.AsNoTracking()
                .Where(x => x.CareHomeId == id && x.Status != "Void" && x.PaymentStatus != "Paid");

            var recent = await dbContext.Invoices.AsNoTracking()
                .Where(x => x.CareHomeId == id)
                .OrderByDescending(x => x.GeneratedAt)
                .Take(8)
                .Select(x => new RecentInvoiceDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    CareHomeName = x.SnapshotCareHomeName,
                    TotalAmount = x.TotalAmount,
                    Status = x.Status
                })
                .ToListAsync();

            return Ok(new CareHomeDashboardDto
            {
                CareHomeId = home.Id,
                Name = home.Name,
                Capacity = home.BedCapacity,
                Occupied = occupied,
                Available = home.BedCapacity - occupied,
                ManagerName = home.ManagerName,
                CurrentClients = home.Clients
                    .Where(c => c.Status == "Current" && !c.IsArchived)
                    .Select(c => $"{c.FirstName} {c.LastName}")
                    .OrderBy(x => x)
                    .ToList(),
                RecentInvoices = recent,
                OutstandingCount = await outstanding.CountAsync(),
                OutstandingAmount = await outstanding.SumAsync(x => (decimal?)x.TotalAmount) ?? 0
            });
        }

        private async Task<List<string>> BuildSetupHints(int tenantId)
        {
            var hints = new List<string>();
            if (!await dbContext.Companies.AnyAsync(x => x.TenantId == tenantId))
            {
                hints.Add("Add a company (legal entity) for this organisation.");
            }

            if (!await dbContext.CareHomes.AnyAsync(x => x.TenantId == tenantId))
            {
                hints.Add("Add a care home under a company.");
            }

            if (!await dbContext.FundingAuthorities.AnyAsync(x => x.TenantId == tenantId))
            {
                hints.Add("Add funding authorities used for billing.");
            }

            if (!await dbContext.NominalCodes.AnyAsync(x => x.TenantId == tenantId))
            {
                hints.Add("Add nominal codes for Sage posting.");
            }

            if (!await dbContext.InvoiceTemplates.AnyAsync(x => x.TenantId == tenantId && x.IsActive))
            {
                hints.Add("Configure at least one invoice template.");
            }

            if (!await dbContext.Clients.AnyAsync(x => x.TenantId == tenantId && !x.IsArchived))
            {
                hints.Add("Add clients (residents) to a care home.");
            }

            if (!await dbContext.ClientFundingContracts.AnyAsync(x => x.TenantId == tenantId && x.Status == "Active"))
            {
                hints.Add("Add funding contracts and rates before generating invoices.");
            }

            return hints;
        }
    }
}

