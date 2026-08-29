# Multi-tenancy

Isolation boundary is **Tenant** (UI: Organisation). Company is a legal entity under a tenant. Client is a resident.

This product does **not** use EF Core global query filters. Design-time migrations, platform tenant CRUD, and financial services that take an explicit `tenantId` would need `IgnoreQueryFilters()` in too many places.

## Request path

```
Request → JWT → tenant_id claim → ITenantContext → ForTenant / Id+TenantId → response
```

- `HttpTenantContext` reads `tenant_id`, `tenant_public_id`, and `tenant_name` from the token.
- PlatformAdmin has **no** `tenant_id`. Operational APIs use `[RequireTenant]` and return **403**, not unfiltered data.

Inactive tenants: users cannot log in; existing tokens receive **403**. Data is retained. PlatformAdmin can reactivate.
- Controllers pass `tenantContext.TenantId` into billing, PDF, Sage, and reports. Request bodies must not supply `tenantId`.
- Get-by-id for tenant data is always `x.Id == id && x.TenantId == tenantId`. Never `FindAsync(id)` for operational rows.

## Helpers

- `ITenantOwned` on aggregate roots that store `TenantId`
- `q.ForTenant(tenantId)` = `Where(x => x.TenantId == tenantId)`
- Same-tenant FK checks load related rows with `TenantId == current` before save

## Child tables without TenantId

Loaded only through a tenant-scoped parent:

- `FundingRate` via contract
- `InvoiceLine` / `CreditNoteLine` via invoice / credit note
- `UserCareHomeAccess` via user (`ApplicationUser.TenantId`) and care home in the same tenant

## Document storage

Paths: `tenants/{publicId}/invoices|credit-notes|sage-exports/`. Filenames are sanitized with `Path.GetFileName`. Paths containing `..` are rejected.

## Numbering

Per-tenant unique `(TenantId, DocumentType)` sequences with prefix and length, for example `INV-0001`. Concurrency still uses `UPDLOCK, ROWLOCK, HOLDLOCK`.

Identifiers (company name, care home code, Sage ID, client reference, invoice number) are **tenant-scoped**, not company-scoped. Two legal entities in one organisation cannot share `CLIENT001`. See `OPEN_BUSINESS_DECISIONS.md`.
