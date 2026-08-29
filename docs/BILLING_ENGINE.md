# Billing engine

Entry points: `POST /api/billing/preview` and `POST /api/billing/generate`.

Implementation: `CareHome.Api.Billing.BillingService`. Controllers pass `tenantId` from JWT; the engine never trusts a body `tenantId`. Preview and generate are scoped with `ForTenant`.

## Eligibility

For each non-archived client in the selected company/home:

1. Occupancy overlap with the requested period
2. Active funding contracts (optionally filtered by category)
3. Contract date overlap
3a. **Defensive overlap:** Active contracts applicable to occupancy ∩ period are grouped by Funding Authority + Invoice Category. If any pair in that group has overlapping contract dates, the engine adds `OVERLAPPING_FUNDING_CONTRACTS` and **does not generate lines** for that stream. Operators must repair the contracts. The engine will not choose one contract, sum both, or silently drop a duplicate.
4. Rate-period overlap
5. Subtract service periods already covered by non-void invoice lines for the same client + contract + category
6. Remaining fragments become preview lines (partial-period / catch-up billing)

This is **intentional**. A billing request may overlap an already-finalized invoice period. Only previously unbilled service dates are invoiced. Already-finalized dates are never duplicated.

Preview returns:

| Field | Meaning |
|---|---|
| `RequestedPeriodStart` / `RequestedPeriodEnd` | The window the operator asked for |
| `Coverage[].AlreadyBilledPeriods` | Finalized (non-void) slices inside that window |
| `Coverage[].RemainingBillablePeriods` | Dates that will be invoiced |
| `SkippedAlreadyBilledDays` | Count of already-billed days excluded from this run |

If no unbilled period remains for the request, `CanGenerate = false` with code `ALREADY_FULLY_BILLED`. Mixed requests (some clients fully billed, others still billable) still generate for the remaining clients; fully billed clients are warnings, not a request-level block.

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

Checked again inside the generate transaction on the **remaining** (unbilled) slices, not the original request window. Duplicate billing of an already-finalized service date returns an error and rolls back.

A second layer blocks **overlapping Active funding contracts** on the same funding stream (Tenant + Client + Funding Authority + Invoice Category) even if historical data was saved before create/update validation existed. Preview `CanGenerate` is false; generate is blocked.

SQL Server cannot express arbitrary inclusive date-range exclusion with a UNIQUE index. Range overlap is therefore a business-logic rule (`FundingContractOverlap` / `DateRanges.Overlaps`), not a database uniqueness constraint.

Concurrent generate requests for the same organisation take an exclusive SQL application lock (`billing-generate-{tenantId}`) inside that transaction so two operators cannot mint duplicate invoice numbers or overlapping lines. Numbers come from `DocumentSequenceService` (`UPDLOCK` on the sequence row), not `MAX(number) + 1`.
