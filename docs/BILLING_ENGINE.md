# Billing engine

Entry points: `POST /api/billing/preview` and `POST /api/billing/generate`.

Implementation: `CareHome.Api.Billing.BillingService`. Controllers pass `tenantId` from JWT; the engine never trusts a body `tenantId`. Preview and generate are scoped with `ForTenant`.

## Eligibility

For each non-archived client in the selected company/home:

1. Occupancy overlap with the requested period
2. Active funding contracts (optionally filtered by category)
3. Contract date overlap
4. Rate-period overlap
5. Subtract service periods already covered by non-void invoice lines for the same client + contract + category
6. Remaining fragments become preview lines (partial-period / catch-up billing)

Miscellaneous unbilled CSV charges in the period can also become MISC lines.

## Grouping

Generated invoices are grouped by:

`Company + Care Home + Funding Authority + Invoice Category`

The invoice header has **no ClientId**. Clients live on `InvoiceLine`.

## Invoice date / due date

**PROVISIONAL:** `InvoiceDate = PeriodEnd`, `DueDate = InvoiceDate + TenantSettings.PaymentTermsDays` (default 30). Currency symbol in exception messages comes from organisation settings.

## Rate calculation — PROVISIONAL BUSINESS ASSUMPTIONS

Isolated in `RateCalculator`:

| Frequency | Formula |
|---|---|
| Daily | `amount × eligible days` |
| Weekly | `(amount / 7) × eligible days` |
| Monthly | for each calendar month: `(amount / daysInMonth) × eligible days in that month` |

Rounding: `MidpointRounding.AwayFromZero` to 2 decimal places (`Common/Money.cs`).

These are **not** stakeholder-approved. Change `RateCalculator` only when the rule is agreed.

## Template precedence

`InvoiceTemplateResolver` loads templates for the current tenant first, then:

1. Care Home + Authority + Category
2. Authority + Category
3. Care Home + Category
4. Company + Category
5. Category default (no home/authority/company)

Missing template blocks generation.

## Overlap protection

Checked again inside the generate transaction. Duplicate billing returns an error and rolls back.
