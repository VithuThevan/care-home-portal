using System.Text;
using CareHome.Api.Models;

namespace CareHome.Api.Export
{
    /// <summary>
    /// PROVISIONAL Sage50 CSV column map. Final import specification requires stakeholder confirmation.
    /// </summary>
    public class Sage50ColumnMap
    {
        public static readonly string[] Headers =
        [
            "AccountRef",
            "NominalCode",
            "InvoiceNumber",
            "InvoiceDate",
            "Details",
            "NetAmount",
            "TaxCode",
            "Department"
        ];

        public string BuildCsv(IEnumerable<Invoice> invoices)
        {
            var builder = new StringBuilder();
            builder.AppendLine(string.Join(",", Headers));

            foreach (var invoice in invoices)
            {
                foreach (var line in invoice.Lines)
                {
                    var values = new[]
                    {
                        Csv(line.SnapshotSageId),
                        Csv(line.SnapshotNominalCode),
                        Csv(invoice.InvoiceNumber),
                        Csv(invoice.InvoiceDate.ToString("yyyy-MM-dd")),
                        Csv(line.Description),
                        Csv(line.LineAmount.ToString("0.00")),
                        Csv("T0"),
                        Csv(invoice.SnapshotCareHomeCode)
                    };
                    builder.AppendLine(string.Join(",", values));
                }
            }

            return builder.ToString();
        }

        private static string Csv(string? value)
        {
            var text = value ?? string.Empty;
            if (text.Contains(',') || text.Contains('"') || text.Contains('\n'))
            {
                return $"\"{text.Replace("\"", "\"\"")}\"";
            }

            return text;
        }
    }
}

