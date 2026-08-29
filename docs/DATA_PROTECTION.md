# Data protection

This is an operational description of how the Care Home Back-Office stores and exposes personal data. It is **not** a GDPR certification, DPIA, or legal advice. A controller/processor determination, lawful basis, retention schedule, and DPA with any host must be made by the organisation’s legal/privacy function.

## Data categories stored

| Category | Examples | Typical tables / fields |
|---|---|---|
| Organisation | Name, address, phone, email | `Tenants` |
| Staff users | Email, display name, roles, care-home assignments, password hashes | `AspNetUsers`, Identity, `UserCareHomeAccess` |
| Resident / client | Name, title, DOB, care type, admission/discharge, email, phone, notes, Sage ID, client reference | `Clients` |
| Funding | Authority, contract periods, rates, nominals | `FundingAuthorities`, `ClientFundingContracts`, `FundingRates` |
| Financial documents | Invoice/credit snapshots, amounts, recipient email | `Invoices`, `InvoiceLines`, `CreditNotes` |
| Files | Invoice/credit PDFs, Sage CSVs, optional logos | Document store (not SQL) |
| Operational logs | Audit, billing exceptions, email send attempts | `AuditLogs`, `BillingExceptionLogs`, `EmailSendLogs` |

There is no card-payment data. There is no advanced field-level encryption beyond SQL/TLS and Identity password hashing.

## Tenant ownership

Operational rows carry `TenantId`. Isolation is application-enforced (no EF global query filters). Cross-tenant API access returns 404 or empty lists. PlatformAdmin has **no** tenant JWT claim and cannot call operational APIs.

## User access

| Role | Access |
|---|---|
| PlatformAdmin | Tenant CRUD only |
| TenantAdmin / Administrator | Full tenant operations and users |
| LocationManager | Assigned care homes in the tenant |
| ReadOnly | Tenant reads; writes 403 |

Inactive users cannot log in. Inactive tenants: login 401; existing tokens receive 403 on APIs. Data is not deleted on deactivation.

## Audit logging

Creates/updates of organisations, users, invoices (generate/void/payment), credits, Sage export, and similar actions write `AuditLogs` (tenant-scoped). There is **no** update/delete API for audit rows. Viewing is TenantAdmin/Administrator within the tenant.

Technical logs may include user id, tenant id, endpoint, correlation id. They must not include passwords, JWTs, connection strings, SMTP passwords, or full resident notes.

## Retention

No automated purge job. Document retention is “keep files until an operator deletes them on disk”. SQL row retention is a **business/legal policy** (not implemented). Agree how long invoices, credits, audit, and resident records are kept.

## Backup handling

Backups contain the same personal and financial data as the live database, plus files if document storage is copied. Treat backup media as confidential. Restore tests must use isolated databases (`docs/BACKUP_RESTORE.md`).

## Data export

Operators can export reports (JSON/CSV/XLSX/PDF) and Sage CSV. There is no resident self-service portability portal. A subject-access export would be an operational extraction of tenant-scoped client, contract, and invoice snapshot rows — not built as a product feature.

## User deletion / deactivation

Users are **deactivated** (`IsActive = false`). There is no hard-delete of Identity users in the API. Prefer deactivation so audit still resolves a user id.

## Resident archival

`IsArchived` hides residents from default lists. Occupancy status is Current / Left / Deceased. There is **no** GDPR erasure tool that strips invoices (snapshots are immutable on purpose). Erasure vs financial record-keeping is a **legal/business** conflict to resolve before promising deletion.

## Transport and API exposure

- Production assumes HTTPS.
- JWTs in `Authorization` header, not query strings.
- Client identifiers in URLs are numeric ids after authentication (not secrets). Avoid putting DOB, notes, or emails in query strings; current list filters use ids, dates, and status.
- Production 500 responses are generic plus a correlation id — no SQL, paths, or stack traces.

## Requirements needing legal/business policy

1. Identity of controller vs processor (especially in SaaS vs dedicated hosting)
2. Lawful basis for resident and funder data
3. Retention periods for invoices, credits, audit, backups, and documents
4. Subject-access and erasure procedure (product has archival/deactivation, not erasure)
5. Subprocessor list (hosting, SMTP, backup)
6. Whether invoice PDFs may include Sage IDs and rates (currently they do)
7. International transfer if the host is outside the UK
