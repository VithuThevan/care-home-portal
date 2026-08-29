using System.Text;
using CareHome.Api.Audit;
using CareHome.Api.Data;
using CareHome.Api.Documents;
using CareHome.Api.Dtos.Sage;
using CareHome.Api.Export;
using CareHome.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Export
{
    public class SageExportService(
        CareHomeDbContext dbContext,
        IDocumentStore documents,
        AuditService audit,
        Sage50ColumnMap columnMap,
        ILogger<SageExportService> logger)
    {
        public async Task<(SageExportPreviewResponse Preview, List<Invoice> Invoices)> PreviewAsync(
            int tenantId,
            SageExportRequest request,
            CancellationToken cancellationToken = default)
        {
            var query = dbContext.Invoices
                .Include(x => x.Lines)
                .Where(x => x.TenantId == tenantId)
                .Where(x => x.Status != "Void")
                .Where(x => x.InvoiceDate >= request.DateFrom && x.InvoiceDate <= request.DateTo);

            if (request.CompanyId.HasValue)
            {
                query = query.Where(x => x.CompanyId == request.CompanyId.Value);
            }

            if (request.CareHomeId.HasValue)
            {
                query = query.Where(x => x.CareHomeId == request.CareHomeId.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                query = query.Where(x => x.Status == request.Status);
            }

            var invoices = await query.OrderBy(x => x.InvoiceNumber).ToListAsync(cancellationToken);
            var rows = new List<SageExportRowDto>();
            var errors = new List<string>();

            foreach (var invoice in invoices)
            {
                if (invoice.SageExportBatchId is not null && !request.IncludeAlreadyExported)
                {
                    rows.Add(new SageExportRowDto
                    {
                        InvoiceId = invoice.Id,
                        InvoiceNumber = invoice.InvoiceNumber,
                        Eligible = false,
                        Reason = "Already exported."
                    });
                    continue;
                }

                foreach (var line in invoice.Lines)
                {
                    var issues = new List<string>();
                    if (string.IsNullOrWhiteSpace(line.SnapshotSageId))
                    {
                        issues.Add("Sage client ID is missing.");
                    }

                    if (string.IsNullOrWhiteSpace(line.SnapshotNominalCode))
                    {
                        issues.Add("Nominal code is missing.");
                    }

                    var eligible = issues.Count == 0;
                    if (!eligible)
                    {
                        errors.Add($"Invoice {invoice.InvoiceNumber} line {line.Id}: {string.Join(" ", issues)}");
                    }

                    rows.Add(new SageExportRowDto
                    {
                        InvoiceId = invoice.Id,
                        InvoiceNumber = invoice.InvoiceNumber,
                        SageId = line.SnapshotSageId,
                        NominalCode = line.SnapshotNominalCode,
                        Amount = line.LineAmount,
                        Eligible = eligible,
                        Reason = eligible ? null : string.Join(" ", issues)
                    });
                }
            }

            return (new SageExportPreviewResponse
            {
                Rows = rows,
                EligibleCount = rows.Count(x => x.Eligible),
                BlockedCount = rows.Count(x => !x.Eligible),
                Errors = errors,
                CanExport = rows.Any(x => x.Eligible) && errors.Count == 0
            }, invoices);
        }

        public async Task<(SageExportBatch? Batch, string? Error)> ExportAsync(
            int tenantId,
            Guid tenantPublicId,
            SageExportRequest request,
            string? userId,
            CancellationToken cancellationToken = default)
        {
            var (preview, invoices) = await PreviewAsync(tenantId, request, cancellationToken);
            if (!preview.CanExport)
            {
                logger.LogWarning(
                    "Sage export blocked. TenantId={TenantId} Reason={Reason}",
                    tenantId,
                    preview.Errors.FirstOrDefault() ?? "Export is blocked until validation errors are resolved.");
                return (null, preview.Errors.FirstOrDefault() ?? "Export is blocked until validation errors are resolved.");
            }

            var eligibleInvoices = invoices
                .Where(i => preview.Rows.Any(r => r.InvoiceId == i.Id && r.Eligible))
                .ToList();

            var csv = columnMap.BuildCsv(eligibleInvoices);
            var fileName = $"sage50-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
            var path = await documents.SaveAsync(
                TenantDocumentPaths.Folder(tenantPublicId, "sage-exports"),
                fileName,
                Encoding.UTF8.GetBytes(csv),
                cancellationToken);

            var batch = new SageExportBatch
            {
                TenantId = tenantId,
                ExportedAt = DateTimeOffset.UtcNow,
                ExportedByUserId = userId,
                DateFrom = request.DateFrom,
                DateTo = request.DateTo,
                CompanyId = request.CompanyId,
                RecordCount = eligibleInvoices.Sum(x => x.Lines.Count),
                FileName = fileName,
                FilePath = path,
                Status = "Completed"
            };

            dbContext.SageExportBatches.Add(batch);
            await dbContext.SaveChangesAsync(cancellationToken);

            foreach (var invoice in eligibleInvoices)
            {
                invoice.SageExportBatchId = batch.Id;
                invoice.SageExportedAt = batch.ExportedAt;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            await audit.LogAsync(
                "SageExport",
                batch.Id.ToString(),
                "Export",
                null,
                new { batch.FileName, batch.RecordCount },
                $"Exported {batch.RecordCount} Sage50 rows.",
                cancellationToken);

            logger.LogInformation(
                "Sage export completed. TenantId={TenantId} BatchId={BatchId} RecordCount={RecordCount}",
                tenantId,
                batch.Id,
                batch.RecordCount);

            return (batch, null);
        }
    }
}

