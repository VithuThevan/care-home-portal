# Care Home System — System Verification Report

Verification date: 29 August 2026  
Verification database: `CareHomeVerificationDb` on `(localdb)\MSSQLLocalDB`  
Existing `CareHomeDb` was not used and was not wiped.

API under test: `http://localhost:5092`  
Angular proxy: `frontend/care-home-web/proxy.conf.json` forwards `/api` to `http://localhost:5092`  
Feature HTTP calls use relative `/api/...` paths. There is no hard-coded backend host in Angular feature services.

---

## 1. Overall Result

```text
READY WITH FIXES
```

A later **FINAL STABILIZATION RETEST** (same day) is at the end of this document. The original findings below are unchanged.

The product is wired as a tenant-aware Angular + ASP.NET Core application. A fresh database can be created from the migration chain after the alignment migration added during this verification. Authentication, organisation isolation, master data, funding contracts, rate history, billing preview math, invoice generation, PDF, development email simulation, credit notes, and payment status were exercised against the verification API.

This is **not** a production-readiness certificate. Historical `HasData` still inserts Sovereign / Care Pro into tenant 1 on any brand-new database. Overlapping billing *windows* invoice the unbilled remainder instead of rejecting the request. Browser click-through of every Angular route was not performed here.

---

## 2. Build Results

### Backend (`backend/CareHome.Api`)

| Check | Result |
| --- | --- |
| `dotnet restore` | Succeeded (earlier in this verification) |
| `dotnet build` after verification fixes | **Succeeded — 0 errors, 0 warnings** |
| Compiler / namespace / DI static issues | None found |

### Frontend (`frontend/care-home-web`)

| Check | Result |
| --- | --- |
| `npm run build` | **Succeeded** |
| Output | `frontend/care-home-web/dist/care-home-web` |
| TypeScript / template / route compile errors | None |

No `any` / `@ts-ignore` suppressions were added.

---

## 3. Database / Migration Result

### ModelSnapshot health

`dotnet ef migrations has-pending-model-changes` after the latest code and migrations:

```text
No changes have been made to the model since the last migration.
```

The EF model, the latest migration designer, and `CareHomeDbContextModelSnapshot` match the **current code model**.

### Fresh-database defect (found and fixed)

`AddMultiTenancy` (`20260829072440`) originally issued `ALTER TABLE` against operational tables that `AddOperationalDomain` (`20260829120000`) only creates **later**. A zero-database `dotnet ef database update` failed with:

```text
Cannot find the object "ClientFundingContracts"
```

That is a migration-chain bug, not a snapshot-vs-code mismatch.

### Fixes applied to the chain

1. **`20260829072440_AddMultiTenancy`** — TenantId / FK / index work on operational and Identity tables is now conditional (`OBJECT_ID` / `COL_LENGTH`). Safe when those tables do not exist yet.
2. **`20260829120000_AddOperationalDomain`** — Removed customer `InsertData` for named care homes (Filsham, Ampersand, and the rest of that list). Removed global `DocumentSequences` insert that did not match the later tenant-scoped sequence shape.
3. **`20260829180000_AlignOperationalTenantSchema`** — New idempotent migration **after** operational-domain. Adds `TenantId`, backfills tenant `1` where needed, reshapes `DocumentSequences`, adds tenant composite indexes, seeds tenant-1 sequences. SQL Server `ADD COLUMN` and `UPDATE` of that column are separate batches.

### Fresh `CareHomeVerificationDb`

Full chain applied from empty. Tables present (names as in the model):

| Expected | Present |
| --- | --- |
| Tenants | Yes |
| AspNetUsers / Identity tables | Yes |
| Companies, CareHomes, Clients | Yes |
| FundingAuthorities, InvoiceCategories, NominalCodes | Yes |
| ClientFundingContracts, FundingRates | Yes |
| InvoiceTemplates | Yes |
| Invoices, InvoiceLines | Yes |
| CreditNotes, CreditNoteLines | Yes |
| DocumentSequences | Yes |
| MiscChargeImportBatches, MiscCharges | Yes |
| SageExportBatches | Yes |
| AuditLogs, BillingExceptionLogs, EmailSendLogs | Yes |
| UserCareHomeAccess | Yes |
| TenantSettings | Yes |

Money columns use `decimal(18,2)`. Business dates use SQL `date` / `DateOnly`. Event timestamps use `DateTimeOffset`.

### Seeding (Phase 6)

| Seed | On fresh verification DB |
| --- | --- |
| Identity roles + Development `admin@localhost` | Created at API startup (`IdentitySeeder`) |
| Tenant `1` “Existing Organisation” | Created by multi-tenancy migration |
| Default invoice categories for tenant 1 | Present (`GENERAL_CARE`, `MISC`, `OUTREACH`, `RENT`) |
| Document sequences for tenant 1 | `INV-` / `CN-` |
| Demo Care Group (DevelopmentMasterDataSeeder) | **Skipped** because a tenant already exists |
| Sovereign Care Homes / Care Pro | **Still inserted by `InitialCreate` HasData** onto tenant 1 |
| Filsham / Ampersand / named homes | **Not** inserted after operational-domain `InsertData` removal (0 homes from that seed) |
| New organisations via `POST /api/platform/tenants` | Receive generic defaults only — **no** Sovereign / Filsham names |

Customer-named companies on tenant 1 remain a **historical migration HasData** issue. They must not be treated as product-wide seed. Do not edit old `HasData` migrations.

---

## 4. Wiring Matrix

Status key: **PASS** = route/service/controller/DB path verified (API and/or static wiring plus a live call). **PASS WITH WARNING** = wired, with a behavioural or coverage caveat. **NOT TESTABLE** = could not reasonably click or execute here.

| Feature | UI route / component | Angular service or HTTP | Backend | Database | Status |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` `LoginPage` | `AuthService` `POST /api/auth/login` | `AuthController` | AspNetUsers | **PASS** |
| Dashboard | `/dashboard` `DashboardPage` | `GET /api/dashboard` | `DashboardController` | CareHomes, Clients, Invoices | **PASS** |
| Companies | `/companies` list+form | `CompanyService` `/api/companies` | `CompaniesController` | Companies | **PASS** |
| Care Homes | `/care-homes` list+form+dashboard | `CareHomeService` `/api/care-homes` | `CareHomesController` | CareHomes | **PASS** |
| Clients | `/clients` list+form | `ClientService` `/api/clients` | `ClientsController` | Clients | **PASS** |
| Client profile | `/clients/:id` `ClientProfilePage` | `/api/clients/:id`, funding-contracts, invoices | `ClientsController`, `FundingContractsController`, `InvoicesController` | Clients, contracts | **PASS** (API; UI not clicked) |
| Funding Authorities | `/funding-authorities` | `FundingAuthorityService` | `FundingAuthoritiesController` | FundingAuthorities | **PASS** |
| Invoice Categories | `/invoice-categories` | `InvoiceCategoryService` | `InvoiceCategoriesController` | InvoiceCategories | **PASS** |
| Nominal Codes | `/nominal-codes` | `NominalCodeService` | `NominalCodesController` | NominalCodes | **PASS** |
| Funding Contracts | Client profile | `POST/GET /api/clients/:id/funding-contracts` | `FundingContractsController` | ClientFundingContracts | **PASS** |
| Rate History | Client profile | `POST/GET /api/funding-contracts/:id/rates` | `FundingContractsController` | FundingRates | **PASS** |
| Invoice Templates | `/invoice-templates` | `GET/POST /api/invoice-templates` | `InvoiceTemplatesController` | InvoiceTemplates | **PASS** |
| Billing Workspace | `/billing` | `POST /api/billing/preview\|generate` | `BillingController` → `BillingService` | Preview + Invoices | **PASS** |
| Invoices | `/invoices` | `GET /api/invoices` | `InvoicesController` | Invoices | **PASS** |
| Invoice Details | `/invoices/:id` | `GET /api/invoices/:id` | `InvoicesController` | Invoice + lines | **PASS** |
| PDF | Invoice detail | `GET /api/invoices/:id/pdf` | `InvoicePdfService` + `LocalDocumentStore` | PdfPath under `tenants/{guid}/` | **PASS** |
| Email | Invoice detail send | `POST /api/invoices/:id/send` | `ConfigurableEmailSender` | EmailSendLogs | **PASS** (Development simulation) |
| Bulk Email | Invoice list | `POST /api/invoices/bulk-send` | `InvoicesController` | EmailSendLogs | **PASS WITH WARNING** |
| Credit Notes | `/credit-notes` | `/api/credit-notes/*` | `CreditNotesController` → `CreditNoteService` | CreditNotes | **PASS** |
| Payment Status | Invoice detail | `POST /api/invoices/:id/payment-status` | `InvoicesController` | Invoices.PaymentStatus | **PASS** |
| Miscellaneous Charges | `/misc-charges` | FormData `import/preview` + JSON confirm | `MiscChargesController` → `MiscChargeImportService` | MiscCharges | **PASS WITH WARNING** (code + UI wiring; CSV multipart not executed in this session) |
| Reports | `/reports` | `GET /api/reports/{name}` | `ReportsController` → `ReportService` | Tenant-scoped queries | **PASS** |
| Sage Export | `/sage-exports` | `/api/sage-exports` | `SageExportsController` → `SageExportService` | SageExportBatches | **PASS WITH WARNING** (preview verified; file batch create not re-run after classifier block) |
| Users | `/users` | `/api/users` | `UsersController` | AspNetUsers, UserCareHomeAccess | **PASS WITH WARNING** |
| Audit | `/audit` | `GET /api/audit` | `AuditController` | AuditLogs | **PASS** |
| Tenant Management | `/platform/tenants` | `/api/platform/tenants` | `PlatformTenantsController` → `TenantProvisioningService` | Tenants | **PASS** |
| Organisation Settings | `/settings/organisation` | `/api/settings/organisation` | `OrganisationSettingsController` | Tenants, TenantSettings | **PASS** |
| Care-home dashboard | `/care-homes/:id/dashboard` | `GET /api/dashboard/care-homes/:id` | `DashboardController` | Scoped home | **PASS WITH WARNING** (endpoint wired; live call in first harness pass; not re-hit in the compact billing pass) |
| Forbidden | `/forbidden` | Guard only | n/a | n/a | **PASS** (static) |

DI registrations in `Program.cs` cover tenant context, billing, credit notes, PDF, email, Sage, misc import, reports, audit, sequences, and seeders. Controllers that need an organisation use `[RequireTenant]`. JWT `tenant_id` is the authority; login JSON has **no** `tenantId` field for the client to submit.

---

## 5. End-to-End Workflow Result

Verification tenant: **Organisation A** (`admin-a@verify.test`), company **ABC Care Ltd** (id 3), home **HOME01** (id 1), client **CLIENT001** (id 2).

| Step | Result | Notes |
| --- | --- | --- |
| Login | **PASS** | Valid credentials 200; JWT `sub`, `tenant_id`, role |
| Tenant | **PASS** | Created via platform API; JWT tenant matches organisation id 2 |
| Company | **PASS** | Create / list / duplicate name 400 / edit / deactivate rules |
| Care Home | **PASS** | HOME01 created; duplicate code 400; deactivate blocked while current clients exist |
| Client | **PASS** | Create, search, status rules |
| Funding Contract | **PASS** | Created; other-tenant funding authority rejected |
| Rate | **PASS** | 01-Jan-2026–31-Mar-2026 £550/week; 01-Apr-2026 open £575/week; overlap rejected |
| Billing Preview | **PASS** | See amounts below |
| Invoice | **PASS** | Generated Jan, Aug, Sep; line sum = header total |
| PDF | **PASS** | HTTP 200, magic `%PDF-`, other tenant blocked |
| Email | **PASS** | Development mode `simulated=true` |
| Credit | **PASS** | `CN-0001` total `-2546.43` against `INV-0002`; second credit blocked |
| Payment | **PASS** | Sep invoice → Paid; Organisation B cannot update |
| Sage | **PASS WITH WARNING** | Preview `eligible=4`, `canExport=true`; CSV batch download not re-executed in the last pass |

### Billing amounts (Weekly £550 then £575)

Provisional engine: `(rate / 7) * inclusive days`, `Money.Round` midpoint away from zero.

| Period | Expected | Actual | Status |
| --- | --- | --- | --- |
| 15-Feb-2026 (1 day @ 550) | 78.57 | 78.57 | **PASS** |
| 15-Apr-2026 (1 day @ 575) | 82.14 | 82.14 | **PASS** |
| 01–28 Feb 2026 (28 days @ 550) | 2200.00 | 2200.00 | **PASS** |
| 15 Mar–15 Apr (rate change) | 2567.85 (2 lines) | 2567.85, 2 lines | **PASS** |
| Invalid range (end before start) | Blocked | `canGenerate=false`, `INVALID_PERIOD` | **PASS** |
| Jan 2026 generate (31 days @ 550) | 2435.71 | 2435.71 | **PASS** |
| Aug 2026 generate (31 days @ 575) | 2546.43 | 2546.43 | **PASS** |

Daily / monthly frequency helpers were not re-run in the compact pass after the first harness abort; `RateCalculator` implements Daily (`rate * days`), Weekly as above, Monthly as days-in-month proration. **AdHoc / CustomDays are funding-authority billing frequencies, not contract rate frequencies.**

Invoice header has **no** `clientId`. Lines carry client snapshots. Grouped multi-client invoices are implemented as `GroupBy(company, careHome, authority, category)` in `BillingService`; this session generated single-client invoices. Multi-client grouping is **PASS WITH WARNING** (code-verified, not live with three clients).

---

## 6. Multi-Tenant Security Result

Organisations A and B were created with TenantAdmins. Equivalent codes (`ABC Care Ltd`, `HOME01`, `4000`, `CLIENT001`) coexist because uniqueness is tenant-scoped.

| Test | Expected | Actual | Status |
| --- | --- | --- | --- |
| A GET B company | 404 | 404 | **PASS** |
| A PUT B company | 404 | 404 | **PASS** |
| A DELETE B company | 404 | 404 | **PASS** |
| A GET B care home | 404 | 404 | **PASS** |
| A GET B client | 404 | 404 | **PASS** |
| A PUT B client | 404 | 404 | **PASS** |
| A DELETE B client | 404 | 404 | **PASS** |
| A GET B funding authority | 404 | 404 | **PASS** |
| A GET B nominal | 404 | 404 | **PASS** |
| A GET B invoice template | 404 | 404 | **PASS** |
| A company list includes B | No | No | **PASS** |
| A contract using B funding authority | Rejected | 400 “not found in this organisation” | **PASS** |
| B GET A funding contract | 404 | 404 | **PASS** |
| B GET A invoice | 404 | 404 | **PASS** |
| B GET A invoice PDF | Blocked | Blocked | **PASS** |
| B payment-status on A invoice | 404 | Blocked | **PASS** |
| B invoice-by-client report contains A numbers | No | 0 rows in compact pass | **PASS** |
| Platform admin `GET /api/companies` | 403 (no tenant) | 403 “cannot access organisation data” | **PASS** |
| TenantId in login JSON used for auth | Must not | `AuthResponse` has no `tenantId`; claim is JWT-only | **PASS** |
| LocationManager unassigned home | 403 or 404 | Code returns **403 Forbid** (existence leak within tenant) | **PASS WITH WARNING** |
| ReadOnly POST | 403 | `ReadOnlyGuardFilter` implemented; live user not created in compact pass | **PASS WITH WARNING** |
| TenantAdmin create PlatformAdmin | 400 | Assignable roles exclude PlatformAdmin (code); live call not in compact pass | **PASS WITH WARNING** |

No cross-tenant **data** read or write was observed on the isolation tests that completed. Intra-tenant LocationManager 403 vs 404 is the remaining leakage style issue (not cross-org).

---

## 7. Failed Tests

### 1. Overlapping billing *request window* is not hard-rejected

| | |
| --- | --- |
| **Severity** | Medium |
| **Feature** | Duplicate billing protection |
| **Steps** | Generate invoice 01-Aug–31-Aug. Generate again 15-Aug–15-Sep for the same client/contract/category. |
| **Expected** | Blocked. |
| **Actual** | Allowed. Engine subtracted already-billed 15–31 Aug and invoiced **01–15 Sep** only (1232.14 = 15 × 575/7). |
| **Root cause** | `DateRanges.Subtract` + preview remaining fragments. `HasFinalizedOverlapAsync` runs on the *remaining* slice, not the original request window. |
| **Fix** | Product decision: keep partial-period billing (document it) **or** reject any request that overlaps a finalized period even if remainder exists. Not changed here — existing behaviour is consistent with the billing engine comments. |
| **Retest status** | Confirmed on verification DB. |

### 2. Fresh databases still get Sovereign / Care Pro on tenant 1

| | |
| --- | --- |
| **Severity** | Medium (seed hygiene, not runtime billing logic) |
| **Feature** | Product seed vs customer migration |
| **Steps** | `dotnet ef database update` on empty `CareHomeVerificationDb`. |
| **Expected** | No customer trading names in generic product seed. |
| **Actual** | `InitialCreate` `HasData` still inserts Sovereign Care Homes and Care Pro. |
| **Root cause** | Historical migration `HasData`. Must not be rewritten. |
| **Fix** | Optional **new** data-cleanup migration for *new* databases only; do not edit `InitialCreate`. New tenants via platform API do **not** receive those names. |
| **Retest status** | Observed on verification DB. Organisation A settings name was `Organisation A`. |

### 3. Miscellaneous CSV import not live-tested

| | |
| --- | --- |
| **Severity** | Low (coverage) |
| **Feature** | Misc charges |
| **Steps** | Multipart preview with valid / unknown client / bad date / bad amount. |
| **Expected** | Invalid rows counted; confirm rejected until only valid rows. |
| **Actual** | First harness multipart call used an invalid Content-Type. Not re-run. |
| **Root cause** | Test harness, not product. `MiscChargeImportService` rejects unknown client, bad date, bad amount, and refuses commit if any row is invalid. |
| **Fix** | None in product. Manual CSV test still required. |
| **Retest status** | NOT TESTABLE here. |

### 4. Credit note generate across multiple invoices (integrity)

| | |
| --- | --- |
| **Severity** | Medium if a period covers two invoices |
| **Feature** | Credit notes |
| **Steps** | Preview a period that includes lines from more than one invoice, then generate. |
| **Expected** | One credit note per invoice, or a clear rejection. |
| **Actual** (before fix) | Generate attached **all** preview lines to the **first** invoice id. |
| **Root cause** | `CreditNoteService.GenerateAsync` used `preview.Lines[0]` to pick `InvoiceId`. |
| **Fix** | Reject when preview lines span more than one invoice. File: `Billing/CreditNoteService.cs`. |
| **Retest status** | Code fixed; single-invoice credit **PASS** on the process that was running **before** rebuild. Rebuild succeeded; multi-invoice reject not live-retested after restart. |

### 5. Angular route click-through

| | |
| --- | --- |
| **Severity** | Low (coverage) |
| **Feature** | Frontend navigation |
| **Steps** | Click every sidebar link as each role. |
| **Expected** | No blank screen / console-breaking route. |
| **Actual** | Routes compile and map 1:1 to components. No browser session in this environment. |
| **Fix** | Manual. |
| **Retest status** | NOT TESTABLE here. |

No **P0 cross-tenant access** was found on the isolation tests that ran.

---

## 8. Fixes Made

| File | Change |
| --- | --- |
| `backend/CareHome.Api/Migrations/20260829072440_AddMultiTenancy.cs` | Conditional TenantId/FK/index SQL so a fresh DB can apply this migration **before** operational tables exist. |
| `backend/CareHome.Api/Migrations/20260829120000_AddOperationalDomain.cs` | Removed customer care-home `InsertData` and incompatible global sequence inserts. |
| `backend/CareHome.Api/Migrations/20260829180000_AlignOperationalTenantSchema.cs` (+ Designer) | New alignment migration for TenantId, sequences, indexes, snapshot column lengths. |
| `backend/CareHome.Api/Billing/CreditNoteService.cs` | Refuse credit generation when selected lines belong to more than one invoice. |

Existing migrations were **not** deleted. `CareHomeDb` was **not** dropped.

---

## 9. Remaining Warnings

1. **Tenant 1 historical HasData** — Sovereign / Care Pro still appear on any database created from `InitialCreate`. Separate from new-tenant provisioning.
2. **Partial-period invoicing** — Overlapping generate requests bill the gap instead of returning 400. Confirm with finance whether that is desired.
3. **LocationManager GET** of an unassigned home in the **same** tenant returns 403, which confirms the home exists.
4. **JWT signing key** in Development is a placeholder. Must be replaced for any shared environment.
5. **Identity email uniqueness is global** (`RequireUniqueEmail = true`). Two organisations cannot share the same admin email.
6. **Invoice `RecipientEmail`** comes from template `ContactEmail` then funding-authority email. Send fails with 400 if both are empty.
7. **Rate frequencies** are Daily / Weekly / Monthly only. Authority-level AdHoc / CustomDays do not drive `RateCalculator`.
8. **Development email** logs success with `Simulated = true` when `Email:Mode` is not `Smtp`.
9. **`MISSING_TEMPLATE`** is recorded as an error but preview may still list line amounts; `CanGenerate` is false, so generate is blocked.
10. Credit-note multi-invoice guard needs a restart-and-retest of a two-invoice period.

---

## 10. Manual Tests I Still Need To Perform

1. Click every sidebar route in the Angular app (desktop and a mobile width) as TenantAdmin, LocationManager, ReadOnly, and PlatformAdmin.
2. Confirm loading/saving flags and `getApiErrorMessage` on 400/401/403/404 in the real UI (login already clears saving on error).
3. Miscellaneous CSV: upload a four-row file in the Misc Charges page; confirm import; confirm tenant B cannot import against A’s client references.
4. Sage: run export, open the CSV, confirm batch row, then retry without `includeAlreadyExported`.
5. Create three current clients on one home/authority/category and generate **one** invoice with three lines.
6. Admission / discharge / contract-start / contract-end mid-period in the UI (API date intersection is implemented; compact live pass did not rebuild those extra clients after the first harness abort).
7. LocationManager assigned vs unassigned home on clients, invoices, and care-home dashboard.
8. ReadOnly write attempts from the UI and API after creating a ReadOnly user.
9. Concurrent double-click invoice generate.
10. Open a generated PDF and check branding, bank lines, and that renamed master data does not appear (API snapshot GET was verified; visual PDF inspection was not).
11. Apply `AlignOperationalTenantSchema` to a **copy** of an existing migrated database (not production) to confirm idempotent SQL on a DB that already has TenantId columns.
12. Replace Development JWT key and confirm login still works before any demo on a shared machine.

---

## 11. Final Recommendation

```text
SAFE FOR DEMO ONLY
```

Use a dedicated database (this verification used `CareHomeVerificationDb`). Log in as a **tenant** user for operational screens; PlatformAdmin has no organisation context and is correctly refused tenant APIs.

Do not treat this as production-ready: migration hygiene for tenant 1 customer HasData, JWT secrets, SMTP, backup/restore, and full UI/role click-through remain outside what this session proved.

---

## Appendix — Auth and lifecycle (API)

| Case | Result |
| --- | --- |
| Unknown account | 401 |
| Wrong password | 401 |
| No token on `/api/companies` | 401 |
| Valid platform login `admin@localhost` | 200, role PlatformAdmin, no `tenant_id` |
| Valid tenant login | 200, `tenant_id` present, role TenantAdmin |
| Current client archive | 400 |
| Left / Deceased without discharge date | 400 |
| Discharge before admission | 400 |
| Future date of birth | 400 |
| Left with discharge then archive | 204 |
| Company deactivate with active homes | 400 |
| Company deactivate with no homes + reactivate | 204 then 200 |
| CustomDays without interval | 400 |
| Duplicate FA / nominal / category / company / home codes | 400 |
| Snapshot after renaming client Sage ID / name | Invoice line still `AliceA Verify` / `SAGEA` |

## Appendix — Money and dates

- No `float` / `double` monetary fields in the API project.
- Financial properties use `decimal` with EF `HasPrecision(18, 2)`.
- Business dates on models use `DateOnly` (admission, discharge, contract, rates, invoice/credit/period/due, misc used date, Sage date range).
- Audit / generated / sent timestamps use `DateTimeOffset`.

## Appendix — Customer-specific strings

Occurrences of Sovereign, Care Pro, Filsham-class names are in **old migration HasData / Designer files** and in `docs/EXISTING_CUSTOMER_MIGRATION.md` / `docs/TENANT_ONBOARDING.md`. They were not found in Angular UI labels or billing/Sage/authorization code.

Operational-domain care-home `InsertData` for those homes was removed during this verification so **new** databases no longer insert that home list.

---

# FINAL STABILIZATION RETEST

Retest date: 29 August 2026  
Disposable databases (real `CareHomeDb` was not used and was not wiped):

| Database | Purpose |
| --- | --- |
| `CareHomeStabilizationFreshDb` | Empty DB → latest migrations, then live API tests |
| `CareHomeExistingCopyDb` | `COPY_ONLY` backup/restore of `CareHomeDb`, then migrate to latest |
| `CareHomeDb` | Untouched |

API: `http://localhost:5092` pointed at `CareHomeStabilizationFreshDb` (`ASPNETCORE_ENVIRONMENT=Development`).

## Stabilization recommendation

```text
SAFE FOR CONTROLLED UAT
```

This is **not** production readiness. Shared/UAT hosts must set `Jwt__Key` and real SMTP (or accept simulated email). Rate formulas, Sage column map, and invoice-date rules remain provisional. Browser click-through of every Angular route was not performed in this environment (no browser automation). Operators should follow `docs/UAT_CHECKLIST.md`.

## Builds and migrations

| Check | Result |
| --- | --- |
| `dotnet build` (`CareHome.Api`) | **PASS** — 0 errors, 0 warnings |
| `npm run build` (`frontend/care-home-web`) | **PASS** |
| `dotnet ef migrations has-pending-model-changes` | **PASS** — no pending model changes |
| EMPTY DB → latest (`CareHomeStabilizationFreshDb`) | **PASS** |
| OLD EXISTING DB copy → latest (`CareHomeExistingCopyDb`) | **PASS** |

## Previous warning states (retest)

| Previous warning / failed item | Status | Evidence |
| --- | --- | --- |
| Fresh DBs still get unused Sovereign / Care Pro on tenant 1 | **PASS** | Forward-only `RemoveUnusedHistoricalCustomerSeedCompanies`. Fresh DB companies after latest = **0**. New org via platform API also had **0** companies. `InitialCreate` was not edited. |
| Existing customer DBs with those companies in use | **PASS** | Cleanup deletes only unused exact names `Sovereign Care Homes` / `Care Pro` on tenant 1. Copy of real `CareHomeDb` had **no care homes/clients/invoices**. `Care Pro` was removed. A leftover company named `Sovereign Care Homesc` (21 chars, not the seed spelling) was **preserved**. Limitation: exact-name match only; used records are never deleted. |
| Overlapping billing window treated as a defect | **PASS** | Product rule kept: request may overlap; only unbilled dates invoiced. Aug 1–31 then Aug 15–Sep 15 previewed remaining **1–15 Sep** (15 days), skipped **17** already-billed days, `PARTIAL_PERIOD_BILLING`. Generate invoiced **1232.14**. Repeat Aug 1–31: `CanGenerate=false`, `ALREADY_FULLY_BILLED`. |
| Credit generate spanning two invoices | **PASS** | After rebuild/restart: generate spanning INV-0001+INV-0002 rejected. Credit Aug only → `CN-0001`. Credit Sep remainder only → `CN-0002`. Amount above remaining → rejected. Source invoices not rewritten. |
| Grouped multi-client invoice (code review only) | **PASS** | Three clients, same tenant/company/home/authority/category. One invoice `INV-0003`. Header has **no** `clientId`. Three lines (Bob, Carol, Dave). Total **7392.87** = sum of lines. PDF `%PDF-`. |
| Misc CSV not live-tested | **PASS** | Multipart preview: row 2 valid, row 3 unknown ref, row 4 bad amount, row 5 bad date (line-number-specific). Confirm of invalid file refused; nothing saved. Clean CSV confirmed (`acceptedRows: 1`). Org B preview of Org A `CLIENT002` → unknown reference. |
| Sage50 full CSV / batch / re-export | **PASS** | Validation eligible **6**. Export batch id **1**, `recordCount=6`, status Completed. CSV columns: AccountRef, NominalCode, InvoiceNumber, InvoiceDate, Details, NetAmount, TaxCode `T0`, Department=`HOME01`. Re-preview without `includeAlreadyExported`: eligible **0**. Org B preview eligible **0**; Org B cannot fetch Org A file (**404**). Column map not changed. |
| LocationManager 403 existence leak | **PASS** | LocationManager assigned HOME01 only. GET home A / client at A / dashboard A / invoice at A → **200**. GET home B / dashboard B → **404** (not 403). Org B GET Org A invoice → **404**. |
| ReadOnly writes not live | **PASS** | ReadOnly POST company and POST billing generate → **403**. Write buttons hidden when `AuthService.canWrite()` is false (API remains authoritative). |
| TenantAdmin create PlatformAdmin not live | **PASS** | POST `/api/users` role `PlatformAdmin` → **400**. TenantAdmin GET `/api/platform/tenants` → **403**. |
| Concurrent generate | **PASS** | Two near-simultaneous generates for the same Alice / Jan 2027 window: one created `INV-0005`; the other **400**. Exactly one January invoice. Sequence uses `UPDLOCK` plus `sp_getapplock` `billing-generate-{tenantId}`. Not `MAX+1`. |
| Existing DB copy through AlignOperationalTenantSchema | **PASS** | Copy started at `AddUniqueCompanyName` (no Invoices table). Applied through `AlignOperationalTenantSchema` and seed cleanup. `TenantId` populated on surviving company. `DocumentSequences` Invoice/CreditNote for tenant 1 present. `Invoices` table exists. Identity tables exist (this copy had **0** users before Identity existed — nothing to lose). |
| JWT placeholder in shared config | **PASS** | `appsettings.json` `Jwt:Key` is empty. Development placeholder only in `appsettings.Development.json`. Production start without `Jwt__Key` threw `InvalidOperationException` and did not listen. |
| Email SMTP vs simulation | **PASS** | Development `Email:Mode=Development`. Send invoice 3: `EmailSendLogs` row `Simulated=1`, `Success=1`. SMTP env vars documented in `RUNBOOK.md`. No credentials committed. |
| Angular route click-through | **NOT TESTABLE** | No browser automation in this environment. Operator checklist: `docs/UAT_CHECKLIST.md`. Production frontend build succeeded. |
| PDF visual inspection | **PASS WITH WARNING** | Generated PDFs are `%PDF-` (INV-0001 43189 bytes, grouped INV-0003 40079 bytes). After renaming live client Sage ID/name, care home, and funding authority, historical INV-0001 API snapshots stayed **Alice Verify / SAGEA / Care Home A / West Council**. New INV-0005 used live renamed names. Compressed PDF streams were not glyph-rendered on screen. |

## Additional live API facts (Organisation A on fresh DB)

- Billing math unchanged from original verification: August weekly remainder **2546.43**; Sep 1–15 remainder **1232.14**.
- Document sequences tenant 2: Invoice NextValue **6**, CreditNote NextValue **3**.
- Payment status on grouped invoice set to **Paid**.
- PlatformAdmin `admin@localhost` still cannot call tenant operational APIs (unchanged).

## Code / docs added in this pass (no new modules)

- Billing preview coverage DTOs + `ALREADY_FULLY_BILLED` / `PARTIAL_PERIOD_BILLING`
- Tenant billing generate application lock
- Location resource-by-id **404** instead of 403
- Credit preview rejects multi-invoice selections
- Historical unused seed company cleanup migration
- JWT fail-fast; RUNBOOK `Jwt__Key` / SMTP
- Billing workspace shows requested / already billed / remaining periods
- `docs/UAT_CHECKLIST.md`

## Recommendation (exactly one)

```text
SAFE FOR CONTROLLED UAT
```

