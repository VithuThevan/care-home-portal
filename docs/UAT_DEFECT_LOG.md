# UAT defect log

Environment: original UAT used disposable `CareHomeUatDb`. Targeted retest used disposable `CareHomeUatRetestDb` on `(localdb)\MSSQLLocalDB`, API `http://localhost:5092`, Angular `http://localhost:4200`, email mode Development (simulated). Synthetic organisations only. `CareHomeDb` was not used and was not wiped.

Retest date: **29 August 2026**.

Retest status summary: **UAT-001 CLOSED**. **UAT-002 CLOSED**. **UAT-003 CLOSED**. **UAT-004 CLOSED**. **UAT-005 CLOSED**. **UAT-006 CLOSED**. **UAT-007 CLOSED**.

Final Angular remediation retest (29 August 2026, same disposable `CareHomeUatRetestDb`): HTTP-bound page state converted to signals. Live browser confirmed lists/details render after HTTP 200. Prior retest rows that recorded UAT-002/003/004 as OPEN/FAIL are retained below; **Final Retest** rows are authoritative.

Original defect descriptions below are preserved. Remediation **Fix** rows are unchanged. Retest rows record the targeted retest.

---

## UAT-001

| Field | Value |
|---|---|
| **Severity** | **P0** |
| **Area** | Funding contracts / Billing / Sage |
| **Role** | Administrator / Finance |
| **Preconditions** | Organisation A (Green Valley Care Group). Client Alice Brown (`CLIENT001`) already has an Active General Care contract with East County Council and weekly rates. |
| **Steps to reproduce** | 1. Create a second Active funding contract for the same client, same funding authority, same invoice category, overlapping dates. 2. Preview/generate billing for Oak Lodge / GENERAL_CARE / 01-Aug-2026 to 31-Aug-2026. 3. Open the invoice and the Sage CSV. |
| **Expected** | Either the second contract is rejected with a useful message, or billing invoices a resident **once** per category/authority for a given service date. |
| **Actual** | The API accepted a second overlapping Active contract. Preview produced **six** lines (two per client). Invoice `INV-0001` total **£15,278.58** (2 × £2,546.43 × 3). Sage50 CSV contained **duplicate rows** for SAGE001/SAGE002/SAGE003 on the same invoice number and dates. After the extra contracts were set Inactive, a later May-2026 generate produced **one invoice / three lines / £7,639.29**, which matches a single contract per client. |
| **Business impact** | Duplicate financial billing of the same occupancy/category. Sage would post twice. An operator who adds a “replacement” contract without closing the old one will over-invoice the funder. |
| **Screenshot/reference** | `backend/CareHome.Api/App_Data/uat-output/sage-uat.csv` (duplicate AccountRef rows for INV-0001); GET `/api/clients/1/funding-contracts` returned ids `1` and `10`. |
| **Suggested fix** | Reject overlapping Active contracts for the same client + funding authority + invoice category (or subtract overlapping occupancy so a service date cannot be billed twice across those contracts). Do not change the weekly/monthly formula. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Create/update of Active `ClientFundingContract` rejects overlapping inclusive periods on Tenant+Client+FundingAuthority+InvoiceCategory (`OVERLAPPING_FUNDING_CONTRACT`). Nominal Code is not identity. Billing preview/generate blocks overlapping Active contracts with `OVERLAPPING_FUNDING_CONTRACTS` and emits no duplicate lines. Files: `FundingContractsController.cs`, `FundingContractOverlap.cs`, `BillingService.cs`, `BillingDtos.cs`, `docs/BUSINESS_RULES.md`, `docs/BILLING_ENGINE.md`. Date overlap is not a SQL UNIQUE index because SQL Server cannot express arbitrary range exclusion. |
| **Retest** | Disposable `CareHomeRemediationDb`. Jan–Dec vs Jun–open create rejected. Jan–Mar then Apr–open allowed. SQL-inserted overlapping Active pair: preview `canGenerate=false`, generate HTTP 400, no duplicate lines. After extras inactivated: May 2026 generate **INV-0001**, **3 lines**, **£7,639.29**. Sage preview 3 eligible rows, no duplicate Sage IDs. Unit tests `FundingContractOverlapTests` (4 passed). |
| **Result** | **PASS** |
| **Retest Status** | **CLOSED** |
| **Retest Steps** | Disposable `CareHomeUatRetestDb`. CLIENT001 / SAGE001 / COUNCIL01 / GENERAL_CARE. Create 01-Jan-2026→31-Dec-2026 then 01-Jun-2026→open. Shrink first to Jan–Mar and create Apr→open. PUT Apr start to 15-Mar. SQL-insert overlapping Active pair on POISON01 then preview/generate. Generate May 2026 for Alice/David/Mary. Export Sage CSV. |
| **Retest Expected** | Overlap create/update HTTP 400 `OVERLAPPING_FUNDING_CONTRACT`. Adjacent allowed. SQL-bypass preview `canGenerate=false` `OVERLAPPING_FUNDING_CONTRACTS` with zero lines. May: 1 invoice, 3 lines, £7,639.29. SAGE001/002/003 each once. |
| **Retest Actual** | Overlap create 400 `OVERLAPPING_FUNDING_CONTRACT`. Adjacent allowed. Overlap update 400 same code. Poison preview `canGenerate=false`, `OVERLAPPING_FUNDING_CONTRACTS`, 0 lines; generate 400. May `INV-0001` 3 lines £7,639.29, total = sum of lines, unique SAGE IDs. Sage CSV AccountRef counts 1/1/1. `FundingContractOverlapTests` 4 passed. |
| **Retest Result** | **PASS** |

---

## UAT-002

| Field | Value |
|---|---|
| **Severity** | **P1** |
| **Area** | Angular SPA (clients, invoices, dashboard, invoice detail) |
| **Role** | TenantAdmin / all operational roles |
| **Preconditions** | Logged in as `tenantadmin-a@uat.test`. API returns 200 for `/api/clients` and `/api/invoices/1`. |
| **Steps to reproduce** | 1. Open `/clients`. 2. Wait several seconds. 3. Open `/invoices/1`. 4. Open `/dashboard`. |
| **Expected** | Client rows, invoice header/lines, and dashboard cards appear after the API succeeds. Loading indicators end. |
| **Actual** | Browser received HTTP 200 for login, dashboard, clients, care-homes, and invoice 1. The Clients page remained on **“Loading clients...”**. Invoice detail main content stayed empty (`invoice` never rendered). Dashboard showed the page title only (no KPI cards) at screenshot time after 3+ seconds. Angular 22 is bootstrapped **without Zone.js**; HttpClient callbacks do not trigger change detection on these components. |
| **Business impact** | Care-home operators cannot complete core UAT/production workflows in the web UI even though the API is correct. Hidden/disabled buttons are irrelevant if lists never appear. |
| **Screenshot/reference** | Playwright network trace: `/api/clients?page=1&pageSize=50&includeArchived=false` → 200 while template still showed `Loading clients...`. `/api/invoices/1` → 200 with empty `app-invoice-detail` containers. Screenshots under `backend/CareHome.Api/App_Data/uat-output/ui/`. |
| **Suggested fix** | Enable zoneless-safe updates (signals, `ChangeDetectorRef.markForCheck`, or `provideZoneChangeDetection`) on list/detail pages. Do not treat this as a billing-engine bug. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Root cause: Angular 22 bootstrapped without Zone.js while components used mutable fields + `HttpClient.subscribe`. Application-wide fix: add `zone.js`, `import 'zone.js'` in `main.ts`, `provideZoneChangeDetection()` in `app.config.ts`. HTTP pages already clear `isLoading`/`errorMessage` on success and error; invoice detail and dashboard loading flags aligned. Write buttons gated with existing `AuthService.canWrite()`. |
| **Retest** | `npm run build` succeeded. Dev server rebuilt with Zone.js. Invoice GET 404 returns HTTP 404 and UI sets `isLoading=false` + error. Playwright/Chrome were not available in this remediation environment; operators should confirm `/clients`, `/invoices`, `/invoices/:id`, client profile, `/billing`, `/dashboard` in UAT retest. |
| **Result** | **PASS** (code + build; live browser confirmation deferred to UAT retest) |
| **Retest Status** | **REOPENED** |
| **Retest Steps** | Fresh `ng serve` of current source (`import 'zone.js'` in `main.ts`, `provideZoneChangeDetection()` in `app.config.ts`). Playwright against Microsoft Edge. Login as `tenantadmin-a@uat.test`. Open `/dashboard`, `/companies`, `/care-homes`, `/clients`, `/clients/1`, `/billing`, `/invoices`, `/invoices/1`. Wait for loading to clear. Open `/invoices/99999` for 404. |
| **Retest Expected** | HTTP 200 then loading disappears and data is visible. Clients must leave “Loading clients...”. Invoice detail must render after GET 200. 404 stops loading and shows a useful message. No manual refresh. |
| **Retest Actual** | Login succeeded (shell/org name visible — auth uses a signal). `/api/dashboard`, `/api/clients`, `/api/invoices/1` returned HTTP 200. UI remained on **Loading dashboard...**, **Loading clients...**, **Loading invoice...**. Client profile and invoice list stayed blank. `/invoices/99999` also remained on **Loading invoice...**. Screenshots: `backend/CareHome.Api/App_Data/uat-retest-output/ui/`. Zone.js is present in source; live change detection still does not update these pages. |
| **Retest Result** | **FAIL** |
| **Final Retest Status** | **CLOSED** |
| **Final Retest Actual** | Fresh `ng serve` with `provideZonelessChangeDetection()` and signal-based page state. Playwright Chromium. `/dashboard` showed KPI cards (2 homes, 8 current clients). `/clients` left “Loading clients...” and rendered Alice Brown / CLIENT001 / SAGE001. `/invoices` listed INV-0001. `/invoices/1` left “Loading invoice...” and rendered header + 3 lines. `/clients/1` showed Alice Brown profile. `/billing` company dropdown populated. `/invoices/99999` and `/clients/99999` left loading and showed “Not Found”. TenantAdmin click-through of Companies, Care Homes, Funding Authorities, Invoice Categories, Nominal Codes, Invoice Templates, Credit Notes, Misc Charges, Reports, Sage Export, Users, Audit, Organisation Settings all rendered. PlatformAdmin `/platform/tenants` rendered Green Valley and Sunrise. Screenshots: `backend/CareHome.Api/App_Data/uat-final-retest-output/ui/`. |
| **Final Retest Result** | **PASS** |

---

## UAT-003

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Area** | Billing Workspace UI |
| **Role** | Finance |
| **Preconditions** | Billing preview API returns `nominalCode`, `frequency`, coverage periods. |
| **Steps to reproduce** | Open `/billing`, run Preview for a company/home/category/period. |
| **Expected** | Preview table shows Client, Reference, Sage ID, Funding Authority, Category, **Nominal Code**, Requested period, Billable period, Rate, Frequency, Eligible days, Amount, warnings. |
| **Actual** | API includes the fields. `billing-workspace.html` table columns are Client, Reference, Sage, Authority, Category, From, To, Days, Rate (frequency concatenated), Amount. **Nominal Code is omitted.** Requested vs remaining periods are in a separate coverage table, not on each line. |
| **Business impact** | Operators cannot confirm the nominal they are about to invoice without using another screen or the raw API. |
| **Screenshot/reference** | `frontend/care-home-web/src/app/features/billing/pages/billing-workspace/billing-workspace.html`; screenshot `uat-output/ui/ta-_billing-1280.png`. |
| **Suggested fix** | Add a Nominal column; keep coverage as-is. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Billing preview table in `billing-workspace.html` now shows Nominal from the existing preview DTO (`nominalCode`). Backend already supplied `nominalCode` / `nominalCodeId`; also returns `nominalCodeName`. |
| **Retest** | May preview lines for Alice/David/Mary each had nominal `4000`. |
| **Result** | **PASS** |
| **Retest Status** | **OPEN** |
| **Retest Steps** | API `POST /api/billing/preview` for May 2026 three clients. UI `/billing` Preview as TenantAdmin. Missing-nominal probe via empty NominalCodes.Code on a dedicated client. |
| **Retest Expected** | Preview table visibly shows Nominal **4000**. Missing nominal `canGenerate=false` / `MISSING_NOMINAL`. |
| **Retest Actual** | API May preview: three lines, each `nominalCode=4000`. Missing nominal: `canGenerate=false`, `MISSING_NOMINAL`. UI Preview stayed disabled because the company dropdown never bound (UAT-002). Nominal column was not visibly confirmed in the browser. |
| **Retest Result** | **FAIL** (UI not visible). API-only check **PASS**. |
| **Final Retest Status** | **CLOSED** |
| **Final Retest Actual** | Live `/billing` Preview for Green Valley Care Ltd / Oak Lodge / General Care / 01-May-2026 to 31-May-2026. Preview table columns include Client, Reference, Sage ID, Funding Authority, Invoice Category, **Nominal Code**, Service Period, Eligible Days, Rate, Frequency, Amount. Visible nominal **4000** on preview lines. Exceptions include **MISSING_NOMINAL** for Nina Nominal. Nina-only API preview: `canGenerate=false`, `MISSING_NOMINAL`, 0 lines. Screenshot: `uat-final-retest-output/ui/billing-preview.png`. |
| **Final Retest Result** | **PASS** |

---

## UAT-004

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Area** | Invoice detail UI |
| **Role** | Finance / ReadOnly |
| **Preconditions** | Invoice exists; GET `/api/invoices/{id}` returns invoice date, line Sage ID, rate, service dates. |
| **Steps to reproduce** | Open `/invoices/{id}` as TenantAdmin and as ReadOnly. |
| **Expected** | Header shows invoice date, company, home, authority, category, period, status, payment status, total. Lines show client, reference, Sage ID, rate, service dates, amount. Write actions hidden or disabled for ReadOnly **and** rejected by API. |
| **Actual** | Template shows period/status/payment and lines with Reference, Client, Description, Days, Amount only. **Invoice date, Sage ID, rate, and service dates are not shown.** Email / Mark paid / Mark unpaid / Void are always rendered (not wrapped in `canWrite()`). API correctly returned **403** for ReadOnly POST/PUT/DELETE/generate/credit/payment/Sage/users. |
| **Business impact** | Finance cannot verify billed rates and Sage IDs on screen. ReadOnly users can attempt writes (API stops them; poor operator experience). Combined with UAT-002 the detail page may appear blank until change detection is fixed. |
| **Screenshot/reference** | `frontend/care-home-web/src/app/features/invoices/pages/invoice-detail/invoice-detail.html`. |
| **Suggested fix** | Bind the API fields; gate write buttons with `auth.canWrite()`. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Invoice detail renders snapshot header (number, dates, due date, period, company, home, authority, category, status, payment, total) and line snapshot columns (name, reference, Sage ID, description, service from/to, days, frequency, rate, nominal, amount). Write actions (email/paid/void/generate/add/edit/deactivate/import/export/user create) hidden or disabled via `auth.canWrite()`. API remains authoritative (ReadOnly POST generate **403**). |
| **Retest** | GET `/api/invoices/1` returned due date 2026-06-30, invoice date 2026-05-31, Sage/rate/days/nominal on lines. ReadOnly generate 403. |
| **Result** | **PASS** |
| **Retest Status** | **OPEN** |
| **Retest Steps** | GET `/api/invoices/1` snapshot DTO. Open `/invoices/1` as TenantAdmin. Login as ReadOnly and check write controls on Companies, Care Homes, Clients, Funding Authorities, Invoice Categories, Nominal Codes, Invoice Templates, Billing, Invoices, Credit Notes, Misc Charges, Sage Export, Users. Direct ReadOnly POST generate/payment/contract/Sage/user/credit. |
| **Retest Expected** | Header and line snapshot fields visible. ReadOnly write controls not presented. Write APIs 403. |
| **Retest Actual** | DTO: `INV-0001`, invoice date 2026-05-31, due 2026-06-30, Oak Lodge, East County Council, lines with SAGE001/rate 575/days 31/nominal 4000. UI invoice detail remained on **Loading invoice...** so fields were not visible. ReadOnly: Add/Edit/Generate/Mark paid/Email/Void/Export CSV hidden; `/users` redirected to `/forbidden`. ReadOnly APIs 403. |
| **Retest Result** | **FAIL** (invoice detail UI). ReadOnly UI gating **PASS**. ReadOnly API **PASS**. |
| **Final Retest Status** | **CLOSED** |
| **Final Retest Actual** | Live `/invoices/1` as TenantAdmin showed INV-0001, invoice date 2026-05-31, due 2026-06-30, period 2026-05-01 to 2026-05-31, Green Valley Care Ltd, Oak Lodge, East County Council, General Care, Generated / NotPaid, total 7,639.29. Lines showed Alice/David/Mary, CLIENT001–003, SAGE001–003, service dates, 31 days, Weekly, 575.00, nominal 4000, 2,546.43. ReadOnly: Email / Mark paid / Void hidden; Download PDF and Back remain. Companies/Care Homes/Clients Add buttons hidden. `/users` → `/forbidden`. ReadOnly POST generate **403**. Screenshot: `uat-final-retest-output/ui/invoices_1.png`, `ro_invoices_1.png`. |
| **Final Retest Result** | **PASS** |

---

## UAT-005

| Field | Value |
|---|---|
| **Severity** | **P2** |
| **Area** | Invoice PDF |
| **Role** | Finance / Funder recipient |
| **Preconditions** | Generated grouped invoice; GET `/api/invoices/{id}/pdf` returns `%PDF-`. |
| **Steps to reproduce** | Download the grouped invoice PDF and inspect visually / against the layout in `InvoicePdfService`. |
| **Expected** | Logo (if in scope), organisation, company, care home, recipient, invoice number, invoice date, service period, client rows with descriptions and amounts, rates/Sage/days/line dates as required by the operator checklist, total, bank details, footer, readable margins. |
| **Actual** | File is a valid PDF (QuestPDF A4, margin 40). Layout includes tenant/company/home, heading texts, invoice number, invoice date, service period, recipient, category, table columns **Reference / Client / Description / Amount**, total, bank (sort code `00-00-00`, account `12345678` on the template snapshot), footer/contact. **No logo.** **No Sage ID, rate, eligible days, or per-line service dates.** Text in the file is compressed (not extractable as plain ASCII). Full human page-break/glyph review of a PDF viewer was not completed in this pass; layout was inspected from renderer source plus a saved file. |
| **Business impact** | Legal PDF does not show the rate or Sage ID that finance UAT asked to see. Missing logo is cosmetic if not a contractual requirement. |
| **Screenshot/reference** | `backend/CareHome.Api/App_Data/uat-output/invoice-grouped-uat.pdf`; `backend/CareHome.Api/Documents/InvoicePdfService.cs`. |
| **Suggested fix** | If stakeholders require Sage/rate/dates on the PDF, add snapshot columns to the table. Logo is unimplemented. Do not change billing amounts. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | `InvoicePdfService` prints due date, company, home, authority, category, and line snapshot Sage ID, service dates, days, rate+frequency, nominal, amount. Logo is included when a configured template/home/tenant file can be read at first PDF materialization; missing logo is skipped (no broken placeholder). Cached `PdfPath` is reused so later master-data edits do not rewrite a stored PDF. |
| **Retest** | GET `/api/invoices/1/pdf` → `%PDF-1.7`, 56,875 bytes. After renaming the live client to Zelda Snapshot / SAGE999, invoice DTO lines still showed Alicia Renamed / CHANGED1. |
| **Result** | **PASS** |
| **Retest Status** | **CLOSED** |
| **Retest Steps** | Download `GET /api/invoices/1/pdf` (`INV-0001`). Open in Edge/Acrobat. Then rename live client/home/authority/rate and re-fetch DTO and PDF. |
| **Retest Expected** | Organisation, company, home, authority, invoice number/dates/period, client name/reference/Sage, service dates, days, rate/frequency, nominal, amount, total, bank, footer. No broken-logo placeholder. Historical PDF/DTO unchanged after live edits. |
| **Retest Actual** | `%PDF-` 57,145 bytes. Visually opened: Green Valley Care Group / Green Valley Care Ltd / Oak Lodge / East County Council (COUNCIL01); INV-0001; 2026-05-31 / 2026-06-30; period 2026-05-01 to 2026-05-31; Alice/David/Mary with SAGE001/002/003, 31 days, 575.00 Weekly, 4000, 2546.43; total 7,639.29; bank 00-00-00 / 12345678. No logo (none configured); no broken placeholder. After live rename to Zelda Snapshot / SAGE999 / Oak Lodge RENAMED, DTO and PDF bytes still showed Alice Brown / SAGE001 / Oak Lodge. Screenshot: `uat-retest-output/ui/pdf-invoice-may.png`. Service/description cells show a faint overlapping duplicate of the date text (cosmetic). |
| **Retest Result** | **PASS** |

---

## UAT-006

| Field | Value |
|---|---|
| **Severity** | **P3** |
| **Area** | UX / responsive layout |
| **Role** | All |
| **Preconditions** | Logged-in shell at ~375px width. |
| **Steps to reproduce** | Open `/dashboard` at 375×900. |
| **Expected** | Login, dashboard, and invoice remain usable on a phone-width window. |
| **Actual** | A `@media (max-width: 768px)` rule stacks the shell, but at 375px the dark sidebar still consumes most of the viewport; dashboard heading is a sliver. Tables will require horizontal scroll. Not a functional API failure. |
| **Business impact** | Phone use is awkward. Desktop/tablet (1280/768) is the practical operator surface. |
| **Screenshot/reference** | `uat-output/ui/ta-mobile-_dashboard-375.png`. |
| **Suggested fix** | Collapsible nav or overlay menu. Do not redesign during UAT. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Mobile shell (`max-width: 768px`) hides nav until a Menu toggle expands it (`app.html` / `app.scss` / `app.ts`). Desktop sidebar unchanged. |
| **Retest** | CSS/template change only; no billing impact. Confirm at 375px in UAT retest. |
| **Result** | **PASS** |
| **Retest Status** | **CLOSED** |
| **Retest Steps** | Resize Edge to 375×900. Open `/dashboard` as ReadOnly A. Confirm Menu toggle. |
| **Retest Expected** | Nav hidden until Menu; main heading usable. |
| **Retest Actual** | Menu button visible at 375px; dashboard heading visible. KPI cards still did not render (UAT-002). Screenshot `uat-retest-output/ui/ro-mobile-375.png`. |
| **Retest Result** | **PASS** (menu). Dashboard data still blocked by UAT-002. |

---

## UAT-007

| Field | Value |
|---|---|
| **Severity** | **P3** |
| **Area** | Clients / invoice display names |
| **Role** | Finance |
| **Preconditions** | Clients created with Title `Ms`. |
| **Steps to reproduce** | Preview billing or open invoice lines. |
| **Expected** | Client name as operators expect (e.g. Alice Brown). |
| **Actual** | Snapshot/display uses **“Ms Alice Brown”** (title prefixed). |
| **Business impact** | Cosmetic on invoices/PDFs. |
| **Screenshot/reference** | Billing preview JSON `clientName":"Ms Alice Brown"`. |
| **Suggested fix** | Confirm with operators whether Title belongs on invoices. |
| **Status** | **FIXED** (2026-08-29) |
| **Fix** | Billing `FormatName` now uses FirstName + LastName only (Title remains on the client record). New preview/invoice snapshots omit Title. Existing stored invoice names are not rewritten. |
| **Retest** | May preview names: Alice Brown; David Smith; Mary Jones (no `Ms ` prefix). |
| **Result** | **PASS** |
| **Retest Status** | **CLOSED** |
| **Retest Steps** | May 2026 billing preview for the three grouped clients. Title `Ms` on Alice’s client record. |
| **Retest Expected** | Alice Brown (no Ms prefix). |
| **Retest Actual** | Preview `clientName`: Alice Brown; David Smith; Mary Jones. Invoice/PDF snapshots matched (no Title prefix). |
| **Retest Result** | **PASS** |
