# Runbook

## Prerequisites

- .NET 10 SDK
- SQL Server LocalDB (or SQL Server)
- Node.js + npm
- Angular CLI via the project `package.json`

## Database

1. Confirm `backend/CareHome.Api/appsettings.json` connection string. For verification, point at a **disposable** database, never wipe a live customer database.
2. Apply migrations (this **does** change the target database — run it yourself):

```powershell
cd backend\CareHome.Api
dotnet ef database update
```

If `dotnet ef` is missing:

```powershell
dotnet tool install --global dotnet-ef
```

See `docs/EXISTING_CUSTOMER_MIGRATION.md` for tenant backfill and unused historical company cleanup. Historical `HasData` names in older migrations are not rewritten.

After update, confirm:

```powershell
dotnet ef migrations has-pending-model-changes
```

Expected: `No changes have been made to the model since the last migration.`

## JWT signing key (`Jwt__Key`)

Do **not** commit a production secret.

| Environment | Rule |
|---|---|
| Development | `appsettings.Development.json` may contain the explicit development placeholder. That value is allowed only when `ASPNETCORE_ENVIRONMENT=Development`. |
| Production / Staging / shared | Set `Jwt__Key` via environment variable, user secrets, or the deployment secret store. Issuer and audience stay `Jwt:Issuer` / `Jwt:Audience`. |

Environment variable form (double underscore):

```text
Jwt__Key=<at least 32 characters>
Jwt__Issuer=CareHomeApi
Jwt__Audience=CareHomeWeb
```

If Production starts with a missing key, a weak key, or the development placeholder, the API **fails fast** with a configuration error. Do not generate or store a real production key in this repository.

Token defaults: 8-hour expiry (`Jwt:ExpiryHours`, maximum 12), 2-minute clock skew, issuer `CareHomeApi`, audience `CareHomeWeb`.

## Initial PlatformAdmin (Production)

`admin@localhost` / `DevAdmin!12345` is Development-only.

Production does not create that user. To bootstrap the first PlatformAdmin, set **unique** values once:

```text
Seed__AdminEmail=platform.admin@example.org
Seed__AdminPassword=<strong unique password>
```

Then remove the variables after the first successful login. Empty seed settings mean no PlatformAdmin is created.

## Health

- `GET /health/live` — process alive
- `GET /health/ready` — SQL connectivity

Anonymous. Responses are `{ "status": "...", "correlationId": "..." }` without connection strings or SQL errors.

## Identity lockout and login rate limit

- 5 failed passwords → 15-minute lockout (same generic 401 message)
- Login endpoint: 10 requests per minute per IP (HTTP 429)

Password policy: length 12, upper, lower, digit, non-alphanumeric.

## Migrations

The API does **not** apply EF migrations at startup. See `docs/PRODUCTION_DEPLOYMENT.md`.

## Backend

```powershell
cd backend\CareHome.Api
dotnet restore
dotnet run --launch-profile http
```

Listens on `http://localhost:5092`.

Development login is seeded from `appsettings.Development.json` after a successful start **once Identity tables exist**.

## Frontend

```powershell
cd frontend\care-home-web
npm install
npm start
```

Opens `http://localhost:4200` and proxies `/api` to port 5092.

## Email

`Email:Mode` other than `Smtp` (including `Development`) **simulates** send. The API records `EmailSendLog.Simulated = true`. No message is sent to a real mailbox.

To send real email, set:

```text
Email__Mode=Smtp
Email__FromAddress=billing@example.org
Email__FromName=Care Home Billing
Email__Smtp__Host=smtp.example.org
Email__Smtp__Port=587
Email__Smtp__User=<smtp user>
Email__Smtp__Password=<smtp password>
Email__Smtp__EnableSsl=true
```

SMTP requires a configured host. Credentials must not be committed. User secrets or the deployment secret store are the supported places for passwords.

Development may keep `Email:Mode=Development` in `appsettings.Development.json`. Shared UAT/production hosts must set SMTP (or accept that mail is only simulated).

## PDF storage

Default: `{contentRoot}/App_Data/documents`. Override with `DocumentStorage:RootPath`.
