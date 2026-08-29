# UAT execution report

**Product:** Care Home Back-Office  
**Classification going in:** SAFE FOR CONTROLLED UAT  
**UAT date:** 29 August 2026  
**Tester:** Controlled UAT pass (API + disposable database + Playwright against Angular)  
**This pass did not change application source code.**

---

## Overall result

**FAIL**

P0 duplicate billing is possible when two Active funding contracts share the same client, funding authority, and invoice category. The Angular SPA also failed to render loaded list/detail data after HTTP 200 (P1). Security isolation, role API enforcement, weekly/daily math, overlap remaining-unbilled behaviour, credits, misc CSV, Sage skip-already-exported, and snapshot immutability **passed**.

This is **not** production readiness.

---

## Environment

| Item | Value |
|---|---|
| Database | **CareHomeUatDb** on `(localdb)\MSSQLLocalDB` |
| Separated from | CareHomeDb, CareHomeVerificationDb, CareHomeExistingCopyDb (not used, not wiped) |
| Migrations | Applied through `20260829180000_AlignOperationalTenantSchema` |
| API | `http://localhost:5092` (`ASPNETCORE_ENVIRONMENT=Development`) |
| Frontend | `http://localhost:4200` (Angular 22 `ng serve`, proxy `/api` → 5092) |
| JWT | Non-production `Jwt__Key` via process environment only (not committed) |
| Documents | `backend/CareHome.Api/App_Data/uat-documents` |
| Email | `Email__Mode=Development` (simulated). No real resident/funder SMTP. |
| Evidence | `backend/CareHome.Api/App_Data/uat-output/` (JSON, PDFs, Sage CSV, UI screenshots) |

---

## Test users (usernames only)

| Username | Role | Organisation |
|---|---|---|
| `admin@localhost` | PlatformAdmin | (no tenant) |
| `tenantadmin-a@uat.test` | TenantAdmin | Green Valley Care Group |
| `admin-a@uat.test` | Administrator | Green Valley Care Group |
| `locmgr-a@uat.test` | LocationManager (Oak Lodge only) | Green Valley Care Group |
| `readonly-a@uat.test` | ReadOnly | Green Valley Care Group |
| `tenantadmin-b@uat.test` | TenantAdmin | Sunrise Health Group |

Passwords were synthetic UAT-only and are **not** recorded here.

---

## Organisations

| | Organisation A | Organisation B |
|---|---|---|
| Name | Green Valley Care Group | Sunrise Health Group |
| Trading name | Green Valley | Sunrise Health |
| Not used | Sovereign Care Homes, Care Pro | — |

Organisation A company **Green Valley Care Ltd**; homes **Oak Lodge / HOME01 / 30** and **Rose House / HOME02 / 20**. Organisation B independently created the same company name, `HOME01`, nominal `4000`, and `CLIENT001` without conflict.

---

## Functional matrix

| Module | Result | Notes |
|---|---|---|
| Login / JWT | **PASS** | Wrong token 401. Invalid email/password message exists. Org name on login JWT. |
| Organisation settings | **PASS** | Name, trading name Green Valley, GBP, Europe/London, INV-, CN-, 30 days persist after reload. Invalid payment terms 400. |
| Companies | **PASS** | Create/edit/reload. Duplicate name friendly 400. Deactivate unused + reactivate via PUT `isActive`. |
| Care homes | **PASS** | Create/edit. Duplicate HOME01 400. Empty Rose House deactivate/reactivate. Oak Lodge with Current clients blocked: “This care home has current clients and cannot be deactivated.” |
| Funding authorities | **PASS** | EASTCOUNCIL Council Monthly; NHSLOCAL NHS. Duplicate code 400. CustomDays empty interval 400; interval 28 saved. Deactivate via DELETE/PUT. |
| Invoice categories | **PASS** | Defaults GENERAL_CARE, OUTREACH, RENT, MISC. Edit and custom category supported. Org B independent of Org A edits. |
| Nominal codes | **PASS** | 4000 / 4010 in A. Duplicate 4000 in A rejected. Org B created 4000 independently. |
| Users (create/roles) | **PASS** | TenantAdmin cannot create PlatformAdmin. Cannot assign nonexistent home. Org B cannot assign Oak Lodge. |
| Clients | **PASS** (API) | Create/edit/search/filter/profile. Duplicate Sage ID and reference 400 with useful messages. Future DOB 400. Discharge before admission 400. |
| Client lifecycle | **PASS** | Current cannot archive. Left/Deceased without discharge 400. Left with discharge then archive 204. |
| Invoice templates | **PASS** | General Care template; synthetic bank `00-00-00` / `12345678`; save/reload. |
| Funding contracts / rates | **FAIL** | Create/view/rates/history/overlap-on-same-contract/date validation **PASS**. **Two Active same-FA-same-category contracts allowed → UAT-001.** |
| Billing preview | **PASS** (API) / **FAIL** (UI columns + SPA render) | Required DTO fields present. Preview does not persist invoices. UI missing Nominal (UAT-003). SPA render UAT-002. |
| Billing generate / grouping | **CONDITIONAL** | Clean run (May 2026, one contract each): **1 invoice, 3 lines, £7,639.29**, header has no ClientId, total = sum of lines. Dirty run (Aug, two contracts): 6 lines / doubled total (UAT-001). |
| Invoice snapshot | **PASS** | After renaming client/home/authority, GET invoice still showed original snapshot names. |
| PDF | **FAIL** vs operator visual checklist | Valid PDF; layout gaps UAT-005. Visual page-break/glyph pass incomplete (compressed streams; no dedicated PDF viewer). |
| Billing overlap | **PASS** | 15-Aug–15-Sep: already billed 15–31 Aug, remaining 1–15 Sep. Repeat Aug: `ALREADY_FULLY_BILLED`, `canGenerate=false`. |
| Concurrent generate | **PASS** | Two rapid October generates did not produce two invoices for the same window. |
| Email | **PASS** | Send 200 simulated. EmailSendLog written (document, recipient `finance-uat@greenvalley.test`, timestamp, Simulated=1). Bulk send returned succeeded/failed/skipped. |
| Credit notes | **PASS** | Preview; partial generate; PDF `%PDF-`. Over remaining amount 400. Period spanning two invoices rejected; no extra credit persisted for that request. |
| Payments | **PASS** | Paid persists after reload. Bulk NotPaid. Audit captured payment-related invoice actions. Endpoint returns 200 with body (not 204); behaviour is fine. |
| Misc CSV | **PASS** | Mixed file: row numbers, 1 valid / 3 invalid. Confirm rejected. Clean file imported and batch listed. |
| Reports | **PASS** | All nine endpoints 200 including CSV/xlsx/pdf: client-census, current-rates, invoices-by-client, invoices-by-care-home, income-by-category, occupancy, rate-history, billing-exceptions, outstanding (payment status). |
| Sage export | **PASS** (mapping) / **FAIL** (dup rows from UAT-001) | Validation fields present. CSV columns AccountRef, NominalCode, InvoiceNumber, InvoiceDate, Details, NetAmount, TaxCode T0, Department=HOME01. Re-export skipped already exported. File/batch/timestamp recorded. Duplicate Sage rows followed duplicate invoice lines. |
| LocationManager | **PASS** (API) | Oak Lodge only. Rose House GET and dashboard **404**. No Rose House clients. Direct URL `/care-homes/2/dashboard` loads shell; API does not leak Rose House (UAT-002 may blank the panel). |
| ReadOnly | **PASS** (API) | GET allowed. POST/PUT/DELETE/generate/credit/payment/Sage/users **403**. UI still shows some write buttons (UAT-004). |
| TenantAdmin | **PASS** | Manages own users/homes. Cannot create PlatformAdmin or assign another tenant’s home. Cannot list Org B users. |
| PlatformAdmin | **PASS** | Tenant list; create A/B; deactivate/reactivate B. GET `/api/dashboard` **403** without tenant (“This account cannot access organisation data.”). UI `/dashboard` redirects to Organisations. |
| Multi-tenant isolation | **PASS** | No successful cross-tenant GET of company, home, client, FA, nominal, invoice, PDF, credit, census, Sage file, or audit. **No P0 leakage detected.** |
| Dashboard numbers | **PASS** (API) | Care homes 2, current clients 9 (includes extra UAT clients), available beds 41 (50 capacity − 9). Occupancy table has per-home capacity; no top-level Capacity card. |
| Audit | **PASS** | Timestamp, action, entity, entity id, user id. DB `TenantId` set. Org B audit did not contain Org A resident/home text. |
| Angular click-through | **FAIL** | Every nav route loaded a shell (no JS `pageerror`, no blank document). Org name **Green Valley Care Group** in header. Data views did not bind API results (UAT-002). Desktop 1280 and tablet 768 usable for chrome; 375px cramped (UAT-006). |
| Error experience | **PASS** (API) | Missing name 400, invalid email 400, missing client 404, bad JWT 401, billing missing rate/template `CanGenerate=false` with codes. SPA loading may not end (UAT-002). |

---

## Billing results (expected vs actual)

Rounding: `MidpointRounding.AwayFromZero`, 2 dp, as documented.

| Test | Expected | Actual | Difference |
|---|---|---|---|
| Rate 15-Feb-2026 | £550 | £550.00 | 0 |
| Rate 15-Apr-2026 | £575 | £575.00 | 0 |
| Weekly £575 × 7 days | £575.00 | £575.00 | 0 |
| Weekly £575 × 14 days | £1,150.00 | £1,150.00 | 0 |
| Weekly £575 × 31 days (Aug) **per contract line** | £2,546.43 | £2,546.43 | 0 |
| Daily £100 × 5 days | £500.00 | £500.00 | 0 |
| Monthly £2,500 full Dec 2026 (31 days) | £2,500.00 | £2,500.00 | 0 |
| Monthly £2,500 1–15 Dec (`2500/31×15`) | £1,209.68 | £1,209.68 | 0 |
| Mid-admission 16–30 Nov | £1,232.14 (15 days from admission) | £1,232.14 from 2026-11-16 | 0 |
| Mid-discharge inclusive to 15 Nov | £1,232.14 | £1,232.14 to 2026-11-15 | 0 |
| Contract 16–20 Nov | £410.71 (5 days) | £410.71 | 0 |
| Rate change 31-Mar £550 × 1d | £78.57 | £78.57 | 0 |
| Rate change 01-Apr £575 × 1d | £82.14 | £82.14 | 0 |
| Grouped **May 2026** (3 clients × 31 weekly days, one contract each) | £7,639.29, 1 invoice, 3 lines | £7,639.29, invoiceCount=1 | 0 |
| Grouped **Aug 2026 INV-0001** (two Active contracts each) | £7,639.29, 3 lines | **£15,278.58, 6 lines** | **+£7,639.29** — UAT-001 |

Missing rate / missing OUTREACH template: `canGenerate=false` with `MISSING_RATE` / `MISSING_TEMPLATE`. No silent £0 financial line for the missing-rate client.

---

## PDF result

- File downloaded and confirmed `%PDF-`.
- Layout inspected from `InvoicePdfService` and saved to `uat-output/invoice-grouped-uat.pdf`.
- **Not** fully visually signed off in a PDF reader (streams compressed; no logo; line table incomplete vs checklist). See UAT-005.
- Credit note PDF also `%PDF-`.

---

## Multi-tenant result

**No cross-tenant leakage detected** in API tests for company, care home, client, funding authority, nominal, invoice, invoice PDF, credit note, reports (census), Sage file, users, or audit.

Organisation B successfully reused names/codes `Green Valley Care Ltd`, `HOME01`, `4000`, `CLIENT001`, `EASTCOUNCIL`.

---

## Role result

| Role | Result |
|---|---|
| PlatformAdmin | **PASS** — tenant admin only; no accidental operational tenant data without tenant context. |
| TenantAdmin | **PASS** — own org; cannot mint PlatformAdmin or other-tenant homes/users. |
| Administrator | **PASS** — operational writes in Org A (API). |
| LocationManager | **PASS** — Oak Lodge scope; Rose House 404. |
| ReadOnly | **PASS** — API 403 on all tested writes; GET allowed. UI write buttons still visible (UAT-004). |

---

## Defect summary

| Severity | Count | IDs |
|---|---|---|
| P0 | **1** | UAT-001 |
| P1 | **1** | UAT-002 |
| P2 | **3** | UAT-003, UAT-004, UAT-005 |
| P3 | **2** | UAT-006, UAT-007 |

See `docs/UAT_DEFECT_LOG.md`.

---

## Open business decisions (UAT does not change formulas)

These match `docs/OPEN_BUSINESS_DECISIONS.md` / `docs/BILLING_ENGINE.md`. UAT checked **implementation vs documented provisional rules**, not finance-director sign-off.

| Topic | UAT observation | Stakeholder |
|---|---|---|
| Weekly proration (`amount/7 × days`) | Matches engine and all weekly cases above | **Needs clarification** |
| Monthly proration (`amount/daysInMonth × days` per calendar month, round once) | Full and partial December matched | **Needs clarification** |
| Inclusive billing-day rule | Admission/discharge/contract bounds matched inclusive days | **Needs clarification** |
| Overlapping-request / remaining-unbilled | Remaining Sep slice + `ALREADY_FULLY_BILLED` behaved as documented | **Accepted** as current product rule (still confirm with finance) |
| Invoice grouping (company+home+authority+category, no header ClientId) | Correct when one contract per client | **Accepted** as implemented |
| Invoice numbering `INV-` + pad 4 | `INV-0001` etc. | **Accepted** as implemented |
| 30-day payment terms | Persisted; due date = invoice date + terms | **Accepted** as implemented |
| Credit restrictions (no over-credit; no multi-invoice span) | Both rejections worked | **Accepted** as implemented |
| Sage CSV mapping (T0, Department=home code) | Columns matched invoice snapshots; VAT not applied | **Needs clarification** |

Finance should still formally **Accept** or **Reject** weekly/monthly/inclusive rules before production hardening of amounts.

---

## Recommendation

**UAT FAILED — CRITICAL ISSUES REMAIN**

Do **not** proceed to production hardening yet.

**Run a defect remediation pass first**, then retest at least:

1. Overlapping same-category contracts / duplicate invoice lines / Sage duplicates (UAT-001).  
2. Angular change detection so lists, dashboard, and invoice detail show API data (UAT-002).  
3. Invoice/PDF/preview field gaps if finance requires them on screen and PDF (UAT-003–005).

Do not claim the product is ready for production.
