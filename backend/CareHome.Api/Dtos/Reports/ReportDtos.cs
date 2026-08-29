namespace CareHome.Api.Dtos.Reports
{
    public class CensusRowDto
    {
        public string ClientName { get; set; } = string.Empty;
        public string ReferenceNumber { get; set; } = string.Empty;
        public string CareHomeName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CareType { get; set; } = string.Empty;
        public DateOnly AdmissionDate { get; set; }
    }

    public class CurrentRateRowDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string CareHomeName { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string ClientStatus { get; set; } = string.Empty;
        public string FundingAuthority { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Frequency { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }
    }

    public class InvoiceReportRowDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateOnly InvoiceDate { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string CareHomeName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class IncomeByCategoryRowDto
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class OccupancyRowDto
    {
        public string CareHomeName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int CurrentClients { get; set; }
        public int AvailableBeds { get; set; }
    }

    public class RateHistoryRowDto
    {
        public string ClientName { get; set; } = string.Empty;
        public string FundingAuthority { get; set; } = string.Empty;
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }
        public string Frequency { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
    }

    public class BillingExceptionRowDto
    {
        public DateTimeOffset LoggedAt { get; set; }
        public string Severity { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? ClientName { get; set; }
    }

    public class OutstandingInvoiceRowDto
    {
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateOnly InvoiceDate { get; set; }
        public DateOnly DueDate { get; set; }
        public string CareHomeName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public bool IsDue { get; set; }
    }
}

