# UAT Retest Result

**FAIL**

Environment: disposable `CareHomeUatRetestDb` on `(localdb)\MSSQLLocalDB`. API `http://localhost:5092`. Angular `http://localhost:4200`. `CareHomeDb` was not used and was not wiped. Retest date 29 August 2026.

Financial duplicate-billing (UAT-001) is closed. Multi-tenancy, LocationManager, ReadOnly API, credits, remaining-unbilled overlap, rate formulas, Sage uniqueness, PDF snapshots, and builds passed. Angular change detection (UAT-002) is **reopened**: HTTP 200 responses do not render list/detail data. Core operator screens are not usable. Open P1 = 1, so this retest cannot PASS.

This is not production readiness.

# Defect Results

| ID | Original Severity | Retest Result | Status |
|---|---|---|---|
| UAT-001 | P0 | PASS | CLOSED |
| UAT-002 | P1 | FAIL | REOPENED |
| UAT-003 | P2 | FAIL (UI not visible; API PASS) | OPEN |
| UAT-004 | P2 | FAIL (invoice UI not visible). ReadOnly gating PASS | OPEN |
| UAT-005 | P2 | PASS | CLOSED |
| UAT-006 | P3 | PASS (Menu toggle) | CLOSED |
| UAT-007 | P3 | PASS | CLOSED |

# UAT-001 Financial Retest

Expected:
3 lines
£7,639.29

Actual:
1 invoice (`INV-0001`), 3 lines, £7,639.29. Total = sum of lines (3 × £2,546.43). Clients Alice Brown / David Smith / Mary Jones each appear once.

Sage duplicate result:
SAGE001, SAGE002, SAGE003 each occur **exactly once** in preview and in `sage-may.csv`. No duplicate AccountRef rows.

Overlap create 01-Jan-2026→31-Dec-2026 then 01-Jun-2026→open: HTTP 400 `OVERLAPPING_FUNDING_CONTRACT`. Adjacent Jan–Mar then Apr→open: allowed. Update into overlap: 400 same code. SQL-inserted overlapping Active pair: preview `canGenerate=false`, `OVERLAPPING_FUNDING_CONTRACTS`, zero lines; generate HTTP 400.

# UAT-002 Angular Retest

Pages exercised (Playwright / Microsoft Edge, fresh `ng serve` with `zone.js` + `provideZoneChangeDetection()`):

| Route | HTTP | UI |
|---|---|---|
| `/login` | 200 | PASS — login works; org name in header |
| `/dashboard` | 200 | FAIL — stuck on Loading dashboard... |
| `/companies` | 200 | FAIL — stuck loading; Add Company visible for TenantAdmin |
| `/care-homes` | 200 | FAIL — stuck loading |
| `/clients` | 200 | FAIL — stuck on Loading clients... |
| `/clients/1` | 200 | FAIL — blank main pane |
| `/billing` | (lists 200) | FAIL — company dropdown empty; Preview disabled |
| `/invoices` | 200 | FAIL — no INV-0001 rows bound |
| `/invoices/1` | 200 | FAIL — stuck on Loading invoice... |
| `/invoices/99999` | 404 | FAIL — loading does not stop; no useful error |
| `/funding-authorities`, `/invoice-categories`, `/nominal-codes`, `/invoice-templates`, `/credit-notes`, `/misc-charges`, `/sage-exports`, `/users`, `/reports` | not fully bound | blocked by same CD issue after TenantAdmin pass aborted on Preview |

ReadOnly pass additionally opened the write-gated routes listed under UAT-004. Mobile 375px `/dashboard` opened (Menu visible).

400: empty company name API 400. UI company form not fully exercised because lists do not bind. 403: ReadOnly `/users` → `/forbidden`.

# UAT-003 Preview

Nominal Code: **FAIL** (not visibly shown in UI)

API May preview returned `4000` on all three lines. Missing nominal blocked generate (`MISSING_NOMINAL`). Billing Workspace Preview could not be run in the browser because the company select never populated (UAT-002).

# UAT-004 Invoice UI / ReadOnly

**FAIL** for invoice detail visibility. **PASS** for ReadOnly controls and API.

GET invoice snapshot DTO contained number, dates, due date, period, company, home, authority, category, status, payment, total, and line Sage/rate/dates/nominal/amount. The Angular page did not render those fields.

ReadOnly did not present Add/Edit/Generate/Mark paid/Email/Void/Export CSV/Create user. `/users` → `/forbidden`. Write APIs 403 (generate, payment, contract, Sage, user, credit). GET invoice 200.

# UAT-005 PDF

**PASS**

PDF was visually opened (Edge/Acrobat screenshot `backend/CareHome.Api/App_Data/uat-retest-output/ui/pdf-invoice-may.png`).

Logo: none configured; no broken placeholder. Organisation, company, care home, funding authority, invoice number, invoice date, due date, billing period, client name/reference/Sage ID, service dates, eligible days, rate + frequency, nominal, amount, invoice total, bank details, footer present. Snapshot immutability: after live client/home/authority/rate edits, DTO and PDF still showed original Alice Brown / SAGE001 / Oak Lodge / East County Council and the original byte length.

Cosmetic: faint overlapping duplicate of the service-date text in the description column. Not a financial mismatch.

# Security Regression

Cross-tenant: **PASS**

Organisation B reused HOME01, CLIENT001, 4000. Org A GET Org B company/home/client/FA/contract/invoice/PDF/Sage file: 404. Org B GET Org A invoice 1 / PDF / contract / rates: 404. Census/users/audit did not leak Alice Brown / Oak Lodge. Payment update on the other tenant’s invoice: 404.

LocationManager: **PASS**

HOME01 care home and dashboard 200. HOME02 care home and dashboard 404. HOME02 clients/invoices did not leak ROSE001 / Rose House.

ReadOnly API: **PASS** (403 on tested writes)

# Credit Regression

**PASS**

Period spanning May + June invoices rejected (`cannot span more than one invoice`; generate 400). Credit Invoice A (May Alice) allowed `CN-0001`. Credit Invoice B (June Alice) allowed `CN-0002`. Over-credit generate 400. Original May invoice total remained £7,639.29.

# Billing Overlap

**PASS**

Generate 01-Aug→31-Aug succeeded. Preview 15-Aug→15-Sep: already billed 15-Aug→31-Aug; remaining 01-Sep→15-Sep; `canGenerate=true`. Repeat 01-Aug→31-Aug: `ALREADY_FULLY_BILLED`, `canGenerate=false`; generate 400. No duplicate August lines.

# Builds

Backend: **0 errors** (`dotnet build` to a side output path; in-place copy failed only while the retest API held `CareHome.Api.exe` locked — compiler result 0 errors, 0 warnings)

Frontend: **succeeded** (`npm run build`; pre-existing bundle budget warning 507 kB vs 500 kB)

EF: **No changes have been made to the model since the last migration.**

`FundingContractOverlapTests`: 4 passed.

# Remaining Business Decisions

Weekly proration (`amount/7 × days`) — implemented; UAT matched. **Needs clarification**

Monthly proration (`amount/daysInMonth × days` per calendar month) — implemented; UAT matched. **Needs clarification**

Inclusive billing-day rule — implemented; UAT matched. **Needs clarification**

Sage mapping (T0, Department = home code) — columns matched snapshots. **Needs clarification**

These are not technical failures.

Rate expected vs actual:

| Case | Expected | Actual |
|---|---|---|
| Weekly £575 × 7 days | £575.00 | £575.00 |
| Weekly £575 × 31 days | £2,546.43 | £2,546.43 |
| Daily £100 × 5 days | £500.00 | £500.00 |
| Monthly £2,500 full Dec 2026 | £2,500.00 | £2,500.00 |
| Monthly £2,500 1–15 Dec | £1,209.68 | £1,209.68 |

# Remaining Defects

P0: none

P1: UAT-002 (Angular change detection; lists/details stuck on loading after HTTP 200)

P2: UAT-003 (Nominal not visibly shown — blocked by UAT-002); UAT-004 (invoice snapshot fields not visible on screen — blocked by UAT-002)

P3: faint overlapping service-date text on the invoice PDF (cosmetic). UAT-006 menu is closed.

# Recommendation

UAT FAILED — REMEDIATION REQUIRED
