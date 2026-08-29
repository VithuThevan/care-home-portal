# Learning guide

Study the system in this order. Each section lists files, how data moves, and what to learn.

## 1. Application architecture

**Files:** `docs/ARCHITECTURE.md`, `backend/CareHome.Api/Program.cs`, `frontend/care-home-web/src/app/app.config.ts`

One ASP.NET API and one Angular SPA. Services are registered in `Program.cs`. Learn: modular monolith vs microservices; why controllers stay thin.

## 2. Multi-tenant architecture

**Files:** `docs/MULTI_TENANCY.md`, `Security/ITenantContext.cs`, `Security/HttpTenantContext.cs`, `Security/RequireTenantAttribute.cs`, `Common/TenantQuery.cs`

JWT → `tenant_id` claim → `ITenantContext` → `ForTenant` / `Id + TenantId` → response. Isolation is Tenant (organisation), not Company. PlatformAdmin has no tenant claim and receives 403 on operational APIs. There are no EF global query filters. Learn: why explicit `tenantId` is passed into billing/PDF/Sage instead of ambient HTTP deep in services.

## 3. Angular request flow

**Files:** `app.routes.ts`, `core/auth.interceptor.ts`, `core/api-error.ts`, any `*.service.ts`

User action → component → HttpClient → interceptor adds JWT → proxy `/api` → JSON. Dates stay `yyyy-MM-dd` strings. Learn: standalone components, interceptors, why not NgRx for CRUD.

## 4. ASP.NET request flow

**Files:** `Controllers/*.cs`, global authorize filter in `Program.cs`, `Security/ReadOnlyGuardFilter.cs`

Pipeline: exception handler → CORS → authentication → authorization → controller → service → EF. Errors return `{ message }`. Learn: filters vs attributes; never leak SQL exceptions.

## 5. EF Core / database

**Files:** `Data/CareHomeDbContext.cs`, `Migrations/`, `Models/`

Fluent config: unique indexes, `date` columns, `decimal(18,2)`, Restrict deletes. Learn: HasData vs development seeders; why we do not edit old migrations.

## 6. Company → CareHome → Client

**Files:** `Models/Company.cs`, `CareHomeLocation.cs`, `Clients.cs`, existing companies/care-homes/clients controllers

Hierarchy and deactivation rules. Learn: soft deactivation; Status vs IsArchived.

## 7. Funding contracts

**Files:** `Models/ClientFundingContract.cs`, `Controllers/FundingContractsController.cs`, client profile UI

A client can have several payers. After invoicing, identity fields are locked. Learn: why history is not overwritten.

## 8. Effective-dated rate history

**Files:** `Models/FundingRate.cs`, `AddRate` in `FundingContractsController`, `Common/DateRanges.cs`

Inclusive ranges, overlap rejection, closing previous open-ended rates. Learn: bitemporal-lite versioning.

## 9. Billing calculation

**Files:** `Billing/BillingService.cs`, `Billing/RateCalculator.cs`, `docs/BILLING_ENGINE.md`

Intersection of periods, subtract billed fragments, never assume £0. Learn: eligibility vs calculation; isolate provisional formulas.

## 10. Invoice generation

**Files:** `BillingService.GenerateAsync`, `Services/DocumentSequenceService.cs`

Transaction: lock sequence, insert header+lines, overlap check, commit. Grouped invoices. Learn: concurrency on numbers; why not MAX+1.

## 11. Invoice snapshots

**Files:** `Models/Invoice.cs`, `Models/InvoiceLine.cs`

Names, codes, rates, periods copied at generate time. Learn: financial immutability.

## 12. PDFs

**Files:** `Documents/InvoicePdfService.cs`, `Documents/LocalDocumentStore.cs`

QuestPDF from snapshots. GET pdf generates if missing. Learn: storage abstraction without overengineering.

## 13. Credit notes

**Files:** `Billing/CreditNoteService.cs`, `Models/CreditNote.cs`

Negative amounts, remaining-balance cap, PDF/email. Learn: correction via new documents, not rewrites.

## 14. Authentication / authorization

**Files:** `Security/ApplicationUser.cs`, `Controllers/AuthController.cs`, `UserAccessService.cs`, Angular `AuthService`

Identity hashes passwords. JWT for the SPA. Roles + care-home assignments. Learn: UI hiding ≠ authorization.

## 15. Reports

**Files:** `Services/ReportService.cs`, `Controllers/ReportsController.cs`

JSON plus CSV/Excel/PDF. Learn: ClosedXML vs Excel COM (never COM).

## 16. Sage50 export

**Files:** `Export/SageExportService.cs`, `Sage50ColumnMap.cs`, `docs/SAGE50_EXPORT.md`

Validate snapshots, write CSV, mark batch. Learn: file integration vs database hacking.

## 17. Audit

**Files:** `Audit/AuditService.cs`, `Models/AuditLog.cs`, `Controllers/AuditController.cs`

Append-only JSON old/new values. No update API. Learn: who/when/what for financial and user actions.
