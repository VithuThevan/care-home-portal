using CareHome.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CareHome.Api.Documents;

public class InvoicePdfService(IDocumentStore documents)
{
    public async Task<byte[]> GetOrCreateInvoicePdfAsync(
        Invoice invoice,
        Guid tenantPublicId,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(invoice.PdfPath))
        {
            var existing = await documents.ReadAsync(invoice.PdfPath, cancellationToken);
            if (existing is not null)
            {
                return existing;
            }
        }

        var bytes = RenderInvoice(invoice);
        var path = await documents.SaveAsync(
            TenantDocumentPaths.Folder(tenantPublicId, "invoices"),
            $"invoice-{Path.GetFileName(invoice.InvoiceNumber)}.pdf",
            bytes,
            cancellationToken);
        invoice.PdfPath = path;
        return bytes;
    }

    public async Task<byte[]> GetOrCreateCreditNotePdfAsync(
        CreditNote creditNote,
        Guid tenantPublicId,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(creditNote.PdfPath))
        {
            var existing = await documents.ReadAsync(creditNote.PdfPath, cancellationToken);
            if (existing is not null)
            {
                return existing;
            }
        }

        var bytes = RenderCreditNote(creditNote);
        var path = await documents.SaveAsync(
            TenantDocumentPaths.Folder(tenantPublicId, "credit-notes"),
            $"credit-note-{Path.GetFileName(creditNote.CreditNoteNumber)}.pdf",
            bytes,
            cancellationToken);
        creditNote.PdfPath = path;
        return bytes;
    }

    private static byte[] RenderInvoice(Invoice invoice)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);
                page.Size(PageSizes.A4);
                page.Header().Column(col =>
                {
                    col.Item().Text(invoice.SnapshotTenantName).FontSize(11);
                    col.Item().Text(invoice.SnapshotCompanyName).FontSize(16).Bold();
                    col.Item().Text(invoice.SnapshotCareHomeName).FontSize(12);
                    if (!string.IsNullOrWhiteSpace(invoice.SnapshotHeaderText1))
                    {
                        col.Item().Text(invoice.SnapshotHeaderText1);
                    }

                    if (!string.IsNullOrWhiteSpace(invoice.SnapshotHeaderText2))
                    {
                        col.Item().Text(invoice.SnapshotHeaderText2);
                    }
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    col.Item().Text($"Invoice {invoice.InvoiceNumber}").FontSize(18).Bold();
                    col.Item().Text($"Invoice date: {invoice.InvoiceDate:yyyy-MM-dd}");
                    col.Item().Text($"Service period: {invoice.PeriodStart:yyyy-MM-dd} to {invoice.PeriodEnd:yyyy-MM-dd}");
                    col.Item().Text($"Recipient: {invoice.SnapshotFundingAuthorityName} ({invoice.SnapshotFundingAuthorityCode})");
                    col.Item().Text($"Category: {invoice.SnapshotInvoiceCategoryName}");
                    col.Item().PaddingTop(16).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(1);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Reference");
                            header.Cell().Element(HeaderCell).Text("Client");
                            header.Cell().Element(HeaderCell).Text("Description");
                            header.Cell().Element(HeaderCell).AlignRight().Text("Amount");
                        });

                        foreach (var line in invoice.Lines)
                        {
                            table.Cell().Element(BodyCell).Text(line.SnapshotClientReferenceNumber);
                            table.Cell().Element(BodyCell).Text(line.SnapshotClientName);
                            table.Cell().Element(BodyCell).Text(line.Description);
                            table.Cell().Element(BodyCell).AlignRight().Text(line.LineAmount.ToString("0.00"));
                        }
                    });

                    col.Item().AlignRight().PaddingTop(12).Text($"Total: {invoice.TotalAmount:0.00}").FontSize(14).Bold();

                    col.Item().PaddingTop(20).Text("Bank details").Bold();
                    col.Item().Text($"Account: {invoice.SnapshotBankAccountName}");
                    col.Item().Text($"Sort code: {invoice.SnapshotSortCode}");
                    col.Item().Text($"Account number: {invoice.SnapshotAccountNumber}");
                });

                page.Footer().Column(col =>
                {
                    if (!string.IsNullOrWhiteSpace(invoice.SnapshotFooterText))
                    {
                        col.Item().Text(invoice.SnapshotFooterText).FontSize(9);
                    }

                    col.Item().Text($"{invoice.SnapshotContactName} {invoice.SnapshotContactEmail} {invoice.SnapshotContactPhone}")
                        .FontSize(9);
                });
            });
        }).GeneratePdf();
    }

    private static byte[] RenderCreditNote(CreditNote creditNote)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var invoice = creditNote.Invoice;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);
                page.Size(PageSizes.A4);
                page.Header().Text($"{invoice.SnapshotCompanyName} — Credit Note").FontSize(16).Bold();
                page.Content().PaddingTop(16).Column(col =>
                {
                    col.Item().Text($"Credit note {creditNote.CreditNoteNumber}").FontSize(18).Bold();
                    col.Item().Text($"Against invoice {invoice.InvoiceNumber}");
                    col.Item().Text($"Date: {creditNote.CreditNoteDate:yyyy-MM-dd}");
                    col.Item().Text($"Reason: {creditNote.Reason}");
                    col.Item().PaddingTop(12).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(1);
                        });
                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Description");
                            header.Cell().Element(HeaderCell).AlignRight().Text("Amount");
                        });
                        foreach (var line in creditNote.Lines)
                        {
                            table.Cell().Element(BodyCell).Text(line.Description);
                            table.Cell().Element(BodyCell).AlignRight().Text(line.Amount.ToString("0.00"));
                        }
                    });
                    col.Item().AlignRight().PaddingTop(12).Text($"Total: {creditNote.TotalAmount:0.00}").Bold();
                });
            });
        }).GeneratePdf();
    }

    private static IContainer HeaderCell(IContainer container)
    {
        return container.DefaultTextStyle(x => x.SemiBold()).Padding(4).BorderBottom(1);
    }

    private static IContainer BodyCell(IContainer container)
    {
        return container.Padding(4).BorderBottom(0.5f);
    }
}
