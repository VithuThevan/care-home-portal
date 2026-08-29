# Production business sign-off

These rules are **implemented so the product works**. They are **not** stakeholder-approved. This document is a **production gate**.

Do **not** change the current implementation without approval **and** a re-UAT of billing.

Before **LIVE financial production** (invoicing real funders), each item must be **APPROVED** or **REJECTED** with a replacement that is re-tested.

Status values: `PENDING` | `APPROVED` | `REJECTED`

| Item | Status | Approved by | Approval date |
|---|---|---|---|
| Weekly proration | PENDING | | |
| Monthly proration | PENDING | | |
| Inclusive billing-day rule | PENDING | | |
| Sage mapping | PENDING | | |

---

## Weekly proration

**Status:** PENDING

**Current implementation:** `RateCalculator` — `(weekly rate / 7) × inclusive eligible days`, rounded with midpoint away from zero to 2 decimal places (`Common/Money.cs`).

**Example:** Weekly £575, 1–31 May 2026 (31 days) → `575 / 7 × 31` = £2,546.43 per client. Three grouped clients → **£7,639.29**.

**Business impact:** A 31-day month bills more than four weeks (`4 × 575 = 2,300`). A 28-day February at £575/week bills £2,300.00. Finance must accept day-rate conversion from a weekly price.

**Code:** `backend/CareHome.Api/Billing/RateCalculator.cs`

---

## Monthly proration

**Status:** PENDING

**Current implementation:** For each calendar month in the eligible slice: `(monthly amount / days-in-that-month) × eligible days in that month`, then round the total.

**Example:** £2,000 monthly, 1–15 April (30-day month) → `2000 / 30 × 15` = £1,000.00. A slice spanning March and April uses 31 and 30 as denominators respectively.

**Business impact:** The daily value of a “monthly” rate changes by month length. Leap Februaries differ from non-leap.

**Code:** `backend/CareHome.Api/Billing/RateCalculator.cs`

---

## Inclusive billing-day rule

**Status:** PENDING

**Current implementation:** Eligible period = requested period ∩ occupancy ∩ contract ∩ rate, minus already finalized invoice coverage. Day counts use **inclusive** dates (`DateRanges.InclusiveDays`). Admission and discharge participate in the intersection. Invoice **date** is the period end. Due date is invoice date + `TenantSettings.PaymentTermsDays` (default 30).

**Example:** Occupancy 15 May–15 May is **1** billable day if that day is in the request and contract.

**Business impact:** Inclusive counting is one extra day versus exclusive end dates. Discharge-on-the-day billing must match the operator’s occupancy rule.

**Code:** `BillingService`, `DateRanges`, invoice date in `GenerateAsync`

Related (already documented, not a formula change): a request window may overlap an already-invoiced period; only the **unbilled remainder** is invoiced (`PARTIAL_PERIOD_BILLING` / `ALREADY_FULLY_BILLED`).

---

## Sage mapping

**Status:** PENDING

**Current implementation:** Provisional CSV in `Export/Sage50ColumnMap.cs`. See `docs/SAGE50_EXPORT.md` for columns, sources, and the sign-off checklist.

**Sample output (header + one line):**

```text
AccountRef,NominalCode,InvoiceNumber,InvoiceDate,Details,NetAmount,TaxCode,Department
SAGE001,4000,INV-0001,2026-05-31,<line description>,2546.43,T0,HOME01
```

**Department mapping:** care home **code** snapshot (`HOME01`), not the display name.

**Nominal mapping:** invoice line **snapshot** nominal code.

**Business impact:** A wrong column map posts to the wrong Sage account, nominal, or department. Do **not** claim Sage production readiness until the intended finance user has imported a file into the **target Sage 50** company and confirmed the posting.

**Code:** `Sage50ColumnMap.cs`, `SageExportService.cs`
