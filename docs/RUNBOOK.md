# Runbook

## Prerequisites

- .NET 10 SDK
- SQL Server LocalDB (or SQL Server)
- Node.js + npm
- Angular CLI via the project `package.json`

## Database

1. Confirm `backend/CareHome.Api/appsettings.json` connection string.
2. Apply migrations (this **does** change your database — run it yourself):

```powershell
cd backend\CareHome.Api
dotnet ef database update
```

If `dotnet ef` is missing:

```powershell
dotnet tool install --global dotnet-ef
```

New migration: `20260829072440_AddMultiTenancy`. See `docs/EXISTING_CUSTOMER_MIGRATION.md`. Historical `HasData` names in older migrations are not deleted.

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

## SMTP

`Email:Mode` = `Development` logs/simulates send and records `EmailSendLog.Simulated = true`.

To use real SMTP, set `Email:Mode` = `Smtp` and fill `Email:Smtp:*` via environment variables. Do not commit credentials.

## PDF storage

Default: `{contentRoot}/App_Data/documents`. Override with `DocumentStorage:RootPath`.
