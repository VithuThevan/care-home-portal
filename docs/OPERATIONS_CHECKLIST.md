# Operations checklist

Vendor-neutral. Use whatever monitors the host already has (IIS/Windows, nginx, cloud alarms, SQL Agent, disk alerts).

## Always-on

| Signal | Why | Suggested check |
|---|---|---|
| API availability | Operators cannot log in | `GET /health/live` every minute |
| Database connectivity | Billing and lists fail | `GET /health/ready`; SQL Agent/connection failures |
| HTTP 5xx | Unexpected exceptions | Reverse-proxy 5xx rate; app logs with `CorrelationId` |
| Authentication failures / spikes | Brute force or outage | 401 on `/api/auth/login`; lockout and rate-limit (429) |
| Disk / document storage | PDF and Sage export fail | Free space on `DocumentStorage:RootPath` |
| Email failures | Funders do not receive invoices | `EmailSendLogs` where `Success = 0`; SMTP logs |
| Billing exceptions | Missing rates/nominals/templates | `BillingExceptionLogs`; generate 400s |
| Sage export failures | Finance cannot post | Export 400s; batch `Status`; file present |
| Backup success | Cannot restore | SQL backup job; document-copy job |
| Certificate expiry | Browsers block the app | TLS cert not-after date (30/14/7 day warnings) |

## After each release

Follow `docs/PRODUCTION_SMOKE_TEST.md`. Confirm `dotnet ef migrations has-pending-model-changes` was clean on the build that shipped.

## Financial days

Watch invoice generate errors, sequence lock messages (`Another billing generation is in progress`), and Sage re-export attempts.

## Do not alert on

- Expected 401 for anonymous API probes
- Expected 404 for cross-tenant ids
- Development simulated-email success (`Simulated = true`) if Production is deliberately in simulation — but **do** treat that configuration as a risk (startup warning)

## Log fields to keep

Timestamp, severity, correlation id, user id, tenant id, endpoint, outcome. Never passwords, JWTs, connection strings, SMTP passwords, or resident notes.
