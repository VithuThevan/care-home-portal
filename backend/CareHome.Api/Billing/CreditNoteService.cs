using CareHome.Api.Audit;
using CareHome.Api.Common;
using CareHome.Api.Data;
using CareHome.Api.Dtos.CreditNotes;
using CareHome.Api.Models;
using CareHome.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Billing
{
    public class CreditNoteService(
        CareHomeDbContext dbContext,
        DocumentSequenceService sequences,
        AuditService audit)
    {
        public async Task<CreditNotePreviewResponse> PreviewAsync(
            int tenantId,
            CreditNotePreviewRequest request,
            CancellationToken cancellationToken = default)
        {
            var eligible = await LoadEligibleLinesAsync(tenantId, request, cancellationToken);
            var exceptions = new List<string>();

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                exceptions.Add("A reason is required.");
            }

            if (request.PeriodEnd < request.PeriodStart)
            {
                exceptions.Add("Period end cannot be before start.");
            }

            var lines = new List<CreditNotePreviewLineDto>();
            foreach (var line in eligible)
            {
                var remaining = RemainingCreditable(line);
                if (remaining <= 0)
                {
                    continue;
                }

                var requested = request.LineAmounts?.TryGetValue(line.Id, out var amount) == true
                    ? amount
                    : remaining;

                if (requested > remaining)
                {
                    exceptions.Add(
                        $"Credit for invoice line {line.Id} cannot exceed the remaining invoiced amount of {remaining:0.00}.");
                }

                if (requested <= 0)
                {
                    continue;
                }

                lines.Add(new CreditNotePreviewLineDto
                {
                    InvoiceLineId = line.Id,
                    InvoiceNumber = line.Invoice.InvoiceNumber,
                    ClientName = line.SnapshotClientName,
                    Description = line.Description,
                    ServiceFrom = line.ServicePeriodStart,
                    ServiceTo = line.ServicePeriodEnd,
                    InvoicedAmount = line.LineAmount,
                    AlreadyCredited = Money.Round(line.CreditNoteLines
                        .Where(c => c.CreditNote.Status != "Void")
                        .Sum(c => -c.Amount)),
                    RemainingAmount = remaining,
                    CreditAmount = Money.Round(requested)
                });
            }

            return new CreditNotePreviewResponse
            {
                Lines = lines,
                TotalCredit = Money.Round(lines.Sum(x => x.CreditAmount)),
                Exceptions = exceptions,
                CanGenerate = exceptions.Count == 0 && lines.Count > 0
            };
        }

        public async Task<(CreditNote? Note, string? Error)> GenerateAsync(
            int tenantId,
            CreditNotePreviewRequest request,
            CancellationToken cancellationToken = default)
        {
            var preview = await PreviewAsync(tenantId, request, cancellationToken);
            if (!preview.CanGenerate)
            {
                return (null, preview.Exceptions.FirstOrDefault() ?? "Credit note cannot be generated.");
            }

            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var invoiceId = (await dbContext.InvoiceLines
                .FirstAsync(x => x.Id == preview.Lines[0].InvoiceLineId, cancellationToken)).InvoiceId;

            var invoice = await dbContext.Invoices
                .FirstAsync(x => x.Id == invoiceId && x.TenantId == tenantId, cancellationToken);

            var number = await sequences.NextAsync(tenantId, DocumentTypes.CreditNote, cancellationToken);
            var now = DateTimeOffset.UtcNow;

            var note = new CreditNote
            {
                TenantId = tenantId,
                CreditNoteNumber = number,
                InvoiceId = invoice.Id,
                CreditNoteDate = request.CreditNoteDate == default
                    ? DateOnly.FromDateTime(DateTime.UtcNow.Date)
                    : request.CreditNoteDate,
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                Reason = request.Reason.Trim(),
                Status = "Generated",
                CreatedAt = now,
                GeneratedAt = now,
                RecipientEmail = invoice.RecipientEmail
            };

            foreach (var line in preview.Lines)
            {
                note.Lines.Add(new CreditNoteLine
                {
                    InvoiceLineId = line.InvoiceLineId,
                    ServicePeriodStart = line.ServiceFrom,
                    ServicePeriodEnd = line.ServiceTo,
                    Amount = Money.Round(-line.CreditAmount),
                    Description = line.Description
                });
            }

            note.TotalAmount = Money.Round(note.Lines.Sum(x => x.Amount));
            dbContext.CreditNotes.Add(note);
            await dbContext.SaveChangesAsync(cancellationToken);

            await audit.LogAsync(
                "CreditNote",
                note.Id.ToString(),
                "Generate",
                null,
                new { note.CreditNoteNumber, note.TotalAmount, request.Reason },
                $"Generated credit note {note.CreditNoteNumber}.",
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return (note, null);
        }

        private async Task<List<InvoiceLine>> LoadEligibleLinesAsync(
            int tenantId,
            CreditNotePreviewRequest request,
            CancellationToken cancellationToken)
        {
            var query = dbContext.InvoiceLines
                .Include(x => x.Invoice)
                .Include(x => x.CreditNoteLines)
                    .ThenInclude(x => x.CreditNote)
                .Where(x => x.Invoice.TenantId == tenantId)
                .Where(x => x.Invoice.Status != "Void")
                .Where(x => x.ServicePeriodStart <= request.PeriodEnd && x.ServicePeriodEnd >= request.PeriodStart);

            if (request.ClientId.HasValue)
            {
                query = query.Where(x => x.ClientId == request.ClientId.Value);
            }

            if (request.FundingAuthorityId.HasValue)
            {
                query = query.Where(x => x.Invoice.FundingAuthorityId == request.FundingAuthorityId.Value);
            }

            if (request.InvoiceCategoryId.HasValue)
            {
                query = query.Where(x => x.Invoice.InvoiceCategoryId == request.InvoiceCategoryId.Value);
            }

            return await query.ToListAsync(cancellationToken);
        }

        private static decimal RemainingCreditable(InvoiceLine line)
        {
            var credited = line.CreditNoteLines
                .Where(x => x.CreditNote.Status != "Void")
                .Sum(x => x.Amount);

            return Money.Round(line.LineAmount + credited);
        }
    }
}

