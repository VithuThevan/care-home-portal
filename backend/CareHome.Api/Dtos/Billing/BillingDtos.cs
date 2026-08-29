namespace CareHome.Api.Dtos.Billing
{
    public class BillingPreviewRequest
    {
        public int CompanyId { get; set; }

        public int? CareHomeId { get; set; }

        public int? InvoiceCategoryId { get; set; }

        public DateOnly PeriodStart { get; set; }

        public DateOnly PeriodEnd { get; set; }

        public List<int>? ClientIds { get; set; }
    }

    public class BillingPreviewResponse
    {
        public DateOnly PeriodStart { get; set; }

        public DateOnly PeriodEnd { get; set; }

        public List<BillingPreviewLineDto> Lines { get; set; } = [];

        public List<BillingExceptionDto> Exceptions { get; set; } = [];

        public decimal TotalAmount { get; set; }

        public bool CanGenerate { get; set; }
    }

    public class BillingPreviewLineDto
    {
        public int ClientId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public string ClientReference { get; set; } = string.Empty;

        public string SageId { get; set; } = string.Empty;

        public int CareHomeId { get; set; }

        public string CareHomeName { get; set; } = string.Empty;

        public int CompanyId { get; set; }

        public string CompanyName { get; set; } = string.Empty;

        public int FundingAuthorityId { get; set; }

        public string FundingAuthorityName { get; set; } = string.Empty;

        public int InvoiceCategoryId { get; set; }

        public string InvoiceCategoryName { get; set; } = string.Empty;

        public int NominalCodeId { get; set; }

        public string NominalCode { get; set; } = string.Empty;

        public int ClientFundingContractId { get; set; }

        public int? FundingRateId { get; set; }

        public int? MiscChargeId { get; set; }

        public DateOnly ServiceFrom { get; set; }

        public DateOnly ServiceTo { get; set; }

        public int EligibleDays { get; set; }

        public string Frequency { get; set; } = string.Empty;

        public decimal Rate { get; set; }

        public decimal Amount { get; set; }

        public string Description { get; set; } = string.Empty;

        public int? InvoiceTemplateId { get; set; }
    }

    public class BillingExceptionDto
    {
        public string Severity { get; set; } = "Error";

        public string Code { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public int? ClientId { get; set; }

        public string? ClientName { get; set; }

        public int? CareHomeId { get; set; }

        public int? ClientFundingContractId { get; set; }
    }

    public class BillingGenerateResponse
    {
        public List<int> InvoiceIds { get; set; } = [];

        public int InvoiceCount { get; set; }

        public decimal TotalAmount { get; set; }

        public List<BillingExceptionDto> Exceptions { get; set; } = [];
    }
}

