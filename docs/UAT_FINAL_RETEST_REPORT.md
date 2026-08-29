# UAT Final Retest Report

**Date:** 29 August 2026  
**Database:** disposable `CareHomeUatRetestDb` on `(localdb)\MSSQLLocalDB`  
**API:** `http://localhost:5092`  
**Frontend:** fresh Angular `ng serve` at `http://127.0.0.1:4200`  
**CareHomeDb** was not used and was not wiped.  
This pass did not start production hardening.

# Result

PASS

# UAT-002 Root Cause

Angular 22 change-detection mode is **zoneless**. New Angular v21+ applications do not treat Zone.js macrotasks as a reliable template-refresh signal. This application’s list/detail pages used `HttpClient.subscribe` to assign ordinary mutable fields (`isLoading`, `clients`, `invoice`, `dashboard`, `errorMessage`). Those assignments ran after HTTP 200, but they are not a zoneless notification path, so the template stayed on the first render: **Loading dashboard...**, **Loading clients...**, **Loading invoice...**. A 404 had the same symptom because `isLoading = false` in the error callback also did not notify the view.

The previous remediation installed `zone.js` and called `provideZoneChangeDetection()`. That did not close the defect. Angular 22 `HttpClient` uses `fetch`; Zone.js 0.16 does not consistently schedule Angular’s change-detection for those completions. Login and the shell already worked because `AuthService.currentUser` is a **signal**.

Final solution: keep Angular 22 zoneless (`provideZonelessChangeDetection()`), remove the unused `zone.js` import, and convert HTTP-bound page state to signals (`isLoading`, `isSaving`, `errorMessage`, and loaded collections/records). `finalize()` always clears loading/saving. Route-param pages (`/invoices/:id`, `/clients/:id`, `/care-homes/:id/dashboard`) subscribe to `paramMap` and write results into signals. Reactive Forms were left as forms; only async lookup/load state became signals. `getApiErrorMessage(...)` is unchanged.

# Components Changed

- `frontend/care-home-web/src/main.ts`
- `frontend/care-home-web/src/app/app.config.ts`
- `frontend/care-home-web/src/app/features/login/login.ts` / `login.html`
- `frontend/care-home-web/src/app/features/dashboard/dashboard.ts` / `dashboard.html`
- `frontend/care-home-web/src/app/features/companies/pages/company-list/*`
- `frontend/care-home-web/src/app/features/companies/pages/company-form/*`
- `frontend/care-home-web/src/app/features/care-homes/pages/care-home-list/*`
- `frontend/care-home-web/src/app/features/care-homes/pages/care-home-form/*`
- `frontend/care-home-web/src/app/features/care-homes/pages/care-home-dashboard/*`
- `frontend/care-home-web/src/app/features/clients/pages/client-list/*`
- `frontend/care-home-web/src/app/features/clients/pages/client-form/*`
- `frontend/care-home-web/src/app/features/clients/pages/client-profile/*`
- `frontend/care-home-web/src/app/features/funding-authorities/pages/funding-authority-list/*`
- `frontend/care-home-web/src/app/features/funding-authorities/pages/funding-authority-form/*`
- `frontend/care-home-web/src/app/features/invoice-categories/pages/invoice-category-list/*`
- `frontend/care-home-web/src/app/features/invoice-categories/pages/invoice-category-form/*`
- `frontend/care-home-web/src/app/features/nominal-codes/pages/nominal-code-list/*`
- `frontend/care-home-web/src/app/features/nominal-codes/pages/nominal-code-form/*`
- `frontend/care-home-web/src/app/features/invoice-templates/pages/invoice-template-list/*`
- `frontend/care-home-web/src/app/features/billing/pages/billing-workspace/*`
- `frontend/care-home-web/src/app/features/invoices/pages/invoice-list/*`
- `frontend/care-home-web/src/app/features/invoices/pages/invoice-detail/*`
- `frontend/care-home-web/src/app/features/credit-notes/pages/credit-note-workspace/*`
- `frontend/care-home-web/src/app/features/misc-charges/pages/misc-charges/*`
- `frontend/care-home-web/src/app/features/reports/pages/reports/*`
- `frontend/care-home-web/src/app/features/sage/pages/sage-export/*`
- `frontend/care-home-web/src/app/features/users/pages/user-list/*`
- `frontend/care-home-web/src/app/features/audit/pages/audit-list/*`
- `frontend/care-home-web/src/app/features/settings/pages/organisation-settings/*`
- `frontend/care-home-web/src/app/features/platform/pages/platform-tenant-list/*`
- `frontend/care-home-web/src/app/features/platform/pages/platform-tenant-form/*`

# Browser Pages Retested

TenantAdmin: `/login`, `/dashboard`, `/companies`, `/care-homes`, `/clients`, `/clients/1`, `/funding-authorities`, `/invoice-categories`, `/nominal-codes`, `/invoice-templates`, `/billing`, `/invoices`, `/invoices/1`, `/invoices/99999`, `/clients/99999`, `/credit-notes`, `/misc-charges`, `/reports`, `/sage-exports`, `/users`, `/audit`, `/settings/organisation`

ReadOnly: `/companies`, `/care-homes`, `/clients`, `/invoices/1`, `/users` (redirect `/forbidden`)

PlatformAdmin: `/platform/tenants`

# Error Retest

404: `/invoices/99999` and `/clients/99999` — loading ended; **Not Found** visible.  
403: ReadOnly POST `/api/billing/generate` **403**. ReadOnly `/users` redirected to `/forbidden`.  
loading-state result: no permanently stuck Loading pages on tested routes.

# UAT-003

Nominal code visible: **yes — 4000** on Billing Preview lines (live UI).  
Missing nominal blocks generation: **yes** — UI exception `MISSING_NOMINAL` for Nina Nominal; Nina-only API preview `canGenerate=false`, 0 lines.

# UAT-004

Invoice financial fields visible: **yes** (number, dates, due date, period, company, home, authority, category, status, payment, total; line name/reference/Sage/description/from/to/days/frequency/rate/nominal/amount).  
ReadOnly controls hidden: **yes** (Email / Mark paid / Void / Add Company / Add Client hidden).  
ReadOnly API 403: **yes**.

# Financial Regression

Invoice: **INV-0001**  
Expected: £7,639.29  
Actual: **£7,639.29**  
Lines: **3**  
Sage duplicates: **none** (SAGE001, SAGE002, SAGE003 once each)

# Security Regression

Cross-tenant: **PASS** (Org B GET Org A invoice 1 → 404)  
LocationManager: **PASS** (Oak Lodge 200, Rose House 404)  
ReadOnly: **PASS** (generate 403; write UI hidden)

# Builds

Angular: **succeeded** (`npm run build`)  
Backend: **0 errors** (`dotnet build` to a side output path)  
EF: **No changes have been made to the model since the last migration.**

# Defect Count

Open P0: 0  
Open P1: 0  
Open P2: 0  
Open P3: 0  

(UAT-005 PDF still has a previously noted cosmetic overlapping service-date glyph. Not reopened.)

# Business Decisions Still Pending

Weekly proration  
Monthly proration  
Inclusive billing-day rule  
Sage mapping  

# Recommendation

UAT PASSED — READY FOR PRODUCTION HARDENING
