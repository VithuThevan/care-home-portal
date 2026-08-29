# Tenant onboarding

UI language: **Organisation**, not Tenant.

## Product seed (every environment)

- Identity roles: `PlatformAdmin`, `TenantAdmin`, `Administrator`, `LocationManager`, `ReadOnly`
- Optional `Seed:AdminEmail` / `Seed:AdminPassword` creates a **PlatformAdmin** with no `TenantId`
- No customer names in product seed

## New organisation

`POST /api/platform/tenants` (PlatformAdmin only) creates:

1. Tenant + `TenantSettings` (GBP / £, Europe/London, `INV-` / `CN-`, 4 digits, 30-day terms)
2. Four invoice categories copied for that tenant only: `GENERAL_CARE`, `OUTREACH`, `RENT`, `MISC`
3. Invoice and credit-note document sequences
4. Optional first `TenantAdmin` if admin email and password are supplied

No care homes or companies are created. Operators add those in the organisation.

## Organisation settings

`GET` / `PUT /api/settings/organisation` (TenantAdmin or Administrator). Updates name, branding-safe fields, currency, prefixes, payment terms. SMTP passwords stay in platform environment / secrets. Sender name and from address on settings are non-secret only.

The Angular shell title stays **Care Home Back Office**. The subtitle is the organisation name from `/api/auth/me`.

## Development demo

If the database has **no tenants**, Development startup may seed **Demo Care Group** / Demo Care Ltd / Sunrise House. It never seeds Sovereign or Care Pro. After `AddMultiTenancy` on an existing database, tenant 1 already exists, so demo seed is skipped.

## Platform UI

- `/platform/tenants`, `/platform/tenants/new`, `/platform/tenants/:id`
- Hidden from tenant navigation unless the user is PlatformAdmin
