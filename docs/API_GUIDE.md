# API guide

Login returns `tenantName`, `tenantPublicId`, and roles. Do not send `tenantId` on operational APIs. PlatformAdmin uses `/api/platform/tenants` only.

Error shape (existing convention): `{ "message": "..." }`.

## Auth and shell

| Method | Path |
|---|---|
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| GET | `/api/dashboard` |
| GET | `/api/dashboard/care-homes/{id}` |
| GET/PUT | `/api/settings/organisation` |
| GET/POST | `/api/platform/tenants` |
| GET/PUT | `/api/platform/tenants/{id}` |

## Master data (existing)

`/api/companies`, `/api/care-homes`, `/api/clients`, `/api/funding-authorities`, `/api/invoice-categories`, `/api/nominal-codes`

Clients list is paged: `items`, `totalCount`, `page`, `pageSize`. Filters: `search`, `companyId`, `careHomeId`, `fundingAuthorityId`, `status`, `contractStatus`, `includeArchived`.

## Contracts and rates

| Method | Path |
|---|---|
| GET/POST | `/api/clients/{clientId}/funding-contracts` |
| GET/PUT | `/api/funding-contracts/{id}` |
| GET/POST | `/api/funding-contracts/{id}/rates` |

## Billing and finance

| Method | Path |
|---|---|
| POST | `/api/billing/preview` |
| POST | `/api/billing/generate` |
| GET | `/api/invoices` |
| GET | `/api/invoices/{id}` |
| GET | `/api/invoices/{id}/pdf` |
| POST | `/api/invoices/{id}/send` |
| POST | `/api/invoices/bulk-send` |
| POST | `/api/invoices/{id}/payment-status` |
| POST | `/api/invoices/bulk-payment-status` |
| POST | `/api/invoices/{id}/void` |
| GET/POST | `/api/credit-notes`, `.../preview`, `.../generate`, `.../{id}/pdf`, `.../{id}/send` |
| POST | `/api/misc-charges/import/preview` (multipart file) |
| POST | `/api/misc-charges/import/confirm` |
| GET | `/api/misc-charges/imports` |
| GET | `/api/invoice-templates` |
| POST | `/api/sage-exports/preview` |
| POST | `/api/sage-exports` |
| GET | `/api/sage-exports/{id}/file` |
| GET | `/api/reports/{name}?format=csv\|xlsx\|pdf` |
| GET | `/api/users`, `/api/audit` |
