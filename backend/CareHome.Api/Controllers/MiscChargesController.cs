using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Dtos.MiscCharges;
using CareHome.Api.Security;
using CareHome.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers
{
    [ApiController]
    [Route("api/misc-charges")]
    [RequireTenant]
    public class MiscChargesController(
        MiscChargeImportService importer,
        CareHomeDbContext dbContext,
        ITenantContext tenantContext) : ControllerBase
    {
        [HttpGet("imports")]
        public async Task<ActionResult<PagedResult<MiscChargeBatchDto>>> Imports(int page = 1, int pageSize = 50)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var query = dbContext.MiscChargeImportBatches.AsNoTracking()
                .Where(x => x.TenantId == tenantContext.TenantId);
            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.ImportedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new MiscChargeBatchDto
                {
                    Id = x.Id,
                    FileName = x.FileName,
                    ImportedAt = x.ImportedAt,
                    TotalRows = x.TotalRows,
                    AcceptedRows = x.AcceptedRows,
                    Status = x.Status
                })
                .ToListAsync();

            return Ok(new PagedResult<MiscChargeBatchDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpPost("import/preview")]
        public async Task<ActionResult<MiscChargePreviewResponse>> Preview(IFormFile file)
        {
            if (file is null || file.Length == 0)
            {
                return BadRequest(new { message = "A CSV file is required." });
            }

            await using var stream = file.OpenReadStream();
            return Ok(await importer.PreviewAsync(tenantContext.TenantId, file.FileName, stream));
        }

        [HttpPost("import/confirm")]
        public async Task<IActionResult> Confirm([FromBody] MiscChargePreviewResponse preview)
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var (batch, error) = await importer.CommitAsync(tenantContext.TenantId, preview, userId);
            if (error is not null)
            {
                return BadRequest(new { message = error });
            }

            return Ok(new { batch!.Id, batch.AcceptedRows });
        }
    }
}

