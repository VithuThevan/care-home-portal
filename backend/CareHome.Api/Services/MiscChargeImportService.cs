using CareHome.Api.Audit;
using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Dtos.MiscCharges;
using CareHome.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Services
{
    public class MiscChargeImportService(CareHomeDbContext dbContext, AuditService audit)
    {
        public async Task<MiscChargePreviewResponse> PreviewAsync(
            int tenantId,
            string fileName,
            Stream csvStream,
            CancellationToken cancellationToken = default)
        {
            using var reader = new StreamReader(csvStream);
            var content = await reader.ReadToEndAsync(cancellationToken);
            var rows = Parse(content);

            var response = new MiscChargePreviewResponse { FileName = fileName };
            var clients = await dbContext.Clients.AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .ToListAsync(cancellationToken);
            var nominals = await dbContext.NominalCodes.AsNoTracking()
                .Where(x => x.TenantId == tenantId)
                .ToListAsync(cancellationToken);

            foreach (var row in rows)
            {
                var result = new MiscChargePreviewRowDto { RowNumber = row.RowNumber, Raw = row };
                if (row.Error is not null)
                {
                    result.IsValid = false;
                    result.Error = row.Error;
                    response.Rows.Add(result);
                    continue;
                }

                var client = clients.FirstOrDefault(c =>
                    c.ReferenceNumber.Equals(row.ClientReference, StringComparison.OrdinalIgnoreCase));

                if (client is null)
                {
                    result.IsValid = false;
                    result.Error = $"Unknown client reference '{row.ClientReference}'.";
                    response.Rows.Add(result);
                    continue;
                }

                if (!DateOnly.TryParse(row.UsedDate, out var usedDate))
                {
                    result.IsValid = false;
                    result.Error = "UsedDate must be yyyy-MM-dd.";
                    response.Rows.Add(result);
                    continue;
                }

                if (!decimal.TryParse(row.Amount, out var amount))
                {
                    result.IsValid = false;
                    result.Error = "Amount must be a decimal number.";
                    response.Rows.Add(result);
                    continue;
                }

                NominalCode? nominal = null;
                if (!string.IsNullOrWhiteSpace(row.NominalCode))
                {
                    nominal = nominals.FirstOrDefault(n =>
                        n.Code.Equals(row.NominalCode, StringComparison.OrdinalIgnoreCase));
                    if (nominal is null)
                    {
                        result.IsValid = false;
                        result.Error = $"Unknown nominal code '{row.NominalCode}'.";
                        response.Rows.Add(result);
                        continue;
                    }
                }

                var duplicate = await dbContext.MiscCharges.AnyAsync(x =>
                    x.TenantId == tenantId &&
                    x.ClientId == client.Id &&
                    x.UsedDate == usedDate &&
                    x.Description == row.Description.Trim() &&
                    x.Amount == Money.Round(amount),
                    cancellationToken);

                if (duplicate)
                {
                    result.IsValid = false;
                    result.Error = "Duplicate charge: same client, date, description and amount already imported.";
                    response.Rows.Add(result);
                    continue;
                }

                result.IsValid = true;
                result.ClientId = client.Id;
                result.ClientName = $"{client.FirstName} {client.LastName}";
                result.UsedDate = usedDate;
                result.Description = row.Description.Trim();
                result.Amount = Money.Round(amount);
                result.NominalCodeId = nominal?.Id;
                result.NominalCode = nominal?.Code ?? row.NominalCode;
                response.Rows.Add(result);
            }

            response.ValidCount = response.Rows.Count(x => x.IsValid);
            response.InvalidCount = response.Rows.Count(x => !x.IsValid);
            return response;
        }

        public async Task<(MiscChargeImportBatch? Batch, string? Error)> CommitAsync(
            int tenantId,
            MiscChargePreviewResponse preview,
            string? userId,
            CancellationToken cancellationToken = default)
        {
            if (preview.Rows.Any(x => !x.IsValid))
            {
                return (null, "Invalid rows must be corrected before import. Nothing was saved.");
            }

            var valid = preview.Rows.Where(x => x.IsValid).ToList();
            if (valid.Count == 0)
            {
                return (null, "There are no valid rows to import.");
            }

            var batch = new MiscChargeImportBatch
            {
                TenantId = tenantId,
                FileName = preview.FileName,
                ImportedAt = DateTimeOffset.UtcNow,
                ImportedByUserId = userId,
                TotalRows = preview.Rows.Count,
                AcceptedRows = valid.Count,
                RejectedRows = 0,
                Status = "Committed"
            };

            foreach (var row in valid)
            {
                batch.Charges.Add(new MiscCharge
                {
                    TenantId = tenantId,
                    ClientId = row.ClientId!.Value,
                    ClientReference = row.Raw.ClientReference,
                    UsedDate = row.UsedDate!.Value,
                    Description = row.Description!,
                    Amount = row.Amount!.Value,
                    NominalCodeId = row.NominalCodeId,
                    NominalCodeValue = row.NominalCode,
                    SourceRowNumber = row.RowNumber,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }

            dbContext.MiscChargeImportBatches.Add(batch);
            await dbContext.SaveChangesAsync(cancellationToken);

            await audit.LogAsync(
                "MiscChargeImport",
                batch.Id.ToString(),
                "Import",
                null,
                new { batch.FileName, batch.AcceptedRows },
                $"Imported {batch.AcceptedRows} miscellaneous charges.",
                cancellationToken);

            return (batch, null);
        }

        private static List<RawMiscRow> Parse(string content)
        {
            var lines = content.Replace("\r\n", "\n").Replace('\r', '\n')
                .Split('\n', StringSplitOptions.RemoveEmptyEntries);
            var rows = new List<RawMiscRow>();
            if (lines.Length == 0)
            {
                return rows;
            }

            var start = 0;
            if (lines[0].Contains("ClientReference", StringComparison.OrdinalIgnoreCase))
            {
                start = 1;
            }

            for (var i = start; i < lines.Length; i++)
            {
                var parts = SplitCsv(lines[i]);
                var rowNumber = i + 1;
                if (parts.Length < 4)
                {
                    rows.Add(new RawMiscRow { RowNumber = rowNumber, Error = "Expected columns: ClientReference, UsedDate, Description, Amount, NominalCode." });
                    continue;
                }

                rows.Add(new RawMiscRow
                {
                    RowNumber = rowNumber,
                    ClientReference = parts[0].Trim(),
                    UsedDate = parts[1].Trim(),
                    Description = parts[2].Trim(),
                    Amount = parts[3].Trim(),
                    NominalCode = parts.Length > 4 ? parts[4].Trim() : null
                });
            }

            return rows;
        }

        private static string[] SplitCsv(string line)
        {
            var result = new List<string>();
            var current = new System.Text.StringBuilder();
            var quoted = false;
            foreach (var ch in line)
            {
                if (ch == '"')
                {
                    quoted = !quoted;
                    continue;
                }

                if (ch == ',' && !quoted)
                {
                    result.Add(current.ToString());
                    current.Clear();
                    continue;
                }

                current.Append(ch);
            }

            result.Add(current.ToString());
            return result.ToArray();
        }
    }

    public class RawMiscRow
    {
        public int RowNumber { get; set; }
        public string ClientReference { get; set; } = string.Empty;
        public string UsedDate { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Amount { get; set; } = string.Empty;
        public string? NominalCode { get; set; }
        public string? Error { get; set; }
    }
}

