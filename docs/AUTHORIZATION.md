# Authorization

## Roles

| Role | TenantId | Access |
|---|---|---|
| PlatformAdmin | null | `/api/platform/tenants` only. Operational APIs return 403. |
| TenantAdmin | required | Full tenant operations and users. Cannot create PlatformAdmin or other tenants. |
| Administrator | required | Same as today within the tenant (compatibility). |
| LocationManager | required | Assigned care homes **in this tenant**. |
| ReadOnly | required | Tenant-scoped read. Mutating HTTP methods return 403. |

`SuperAdmin` is a legacy alias mapped to PlatformAdmin on login and in `AddMultiTenancy`.

Hidden Angular buttons are **not** security. API tenant filters, `[RequireTenant]`, care-home checks, and `ReadOnlyGuardFilter` enforce rules.

## JWT

Claims: `sub`, roles, `tenant_id` (omitted if null), `tenant_public_id`, `tenant_name`. Angular may display the organisation name from `/api/auth/me`. Normal APIs must not accept `tenantId` from the client.

Configured in `appsettings.json` (`Jwt:Issuer`, `Jwt:Audience`, `Jwt:Key`). Override `Jwt__Key` in production.

## Development platform admin

`appsettings.Development.json`:

- Email: `admin@localhost`
- Password: `DevAdmin!12345`

Seeded only when `Seed:AdminEmail` and `Seed:AdminPassword` are set. Production `appsettings.json` leaves them empty. This user is PlatformAdmin with no organisation.

## Location Managers

`UserAccessService.GetAllowedCareHomeIdsAsync()` returns `null` for tenant-wide roles (all homes **in the tenant**) or the assigned home IDs. Every list still applies `TenantId`. Dashboard, clients, invoices, billing, and reports honour that list.
