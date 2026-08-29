# Production smoke test

Run after **every** Production or staging deployment. Use a dedicated **test tenant** (synthetic organisation). Do **not** generate a real funder invoice on every deploy unless that test tenant is isolated from live finance.

Replace the base URL. Capture `X-Correlation-ID` on failures.

## Minimum

| # | Check | Expected |
|---|---|---|
| 1 | `GET /health/live` | 200, `{ "status": "Healthy" }` |
| 2 | `GET /health/ready` | 200, `{ "status": "Healthy" }` |
| 3 | `GET /api/companies` (no token) | 401 |
| 4 | `POST /api/auth/login` (test tenant admin) | 200, JWT, organisation name, **no** `tenantId` in JSON body |
| 5 | Dashboard `GET /api/dashboard` | 200 |
| 6 | Client lookup (search or `GET /api/clients?page=1&pageSize=20`) | 200, paged |
| 7 | Funding contract on a test client | 200 |
| 8 | Billing **preview** for a safe historic or future test period | 200; do not Generate unless using the test tenant |
| 9 | Invoice lookup `GET /api/invoices/{id}` | 200 for a test invoice; unknown id 404 |
| 10 | PDF `GET /api/invoices/{id}/pdf` | 200, body starts `%PDF` |
| 11 | Report `GET /api/reports/outstanding` | 200 |
| 12 | Tenant isolation: Tenant B token on Tenant A invoice id | 404 |
| 13 | PlatformAdmin `GET /api/companies` | 403 |
| 14 | `X-Content-Type-Options` on a response | `nosniff` |

## UI (if the SPA was deployed)

Login, dashboard, one client, billing preview, one invoice, PDF download. Confirm loading states end. ReadOnly user must not see write buttons.

## Do not

- Generate live invoices for real funders as a deploy ritual
- Use `admin@localhost` / `DevAdmin!12345` in Production
- Wipe `CareHomeDb` or any live database
