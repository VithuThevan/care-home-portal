# Existing customer migration

This repository’s historical migrations still insert Sovereign Care Homes, Care Pro, and thirteen care homes (including Ampersand House) via `HasData` in old migration files. **Do not edit those files.**

`AddMultiTenancy` (`20260829072440_AddMultiTenancy`):

1. Creates `Tenants` and `TenantSettings`
2. Inserts tenant Id=1, name **Existing Organisation**, fixed `PublicId`
3. Adds `TenantId` as nullable, backfills `1`, then makes it required with Restrict FKs
4. Replaces global unique indexes with tenant-composite indexes
5. Reshapes `DocumentSequences` to `(TenantId, DocumentType)` with prefix and length; maps existing Invoice / CreditNote rows to tenant 1
6. Sets `AspNetUsers.TenantId = 1` except SuperAdmin / PlatformAdmin users (those stay null)
7. Copies SuperAdmin role assignments to PlatformAdmin
8. Adds `SnapshotTenantName` on invoices and backfills the tenant name
9. **Does not** `DeleteData` companies, care homes, invoice categories, or sequences

After update, existing operational data belongs to organisation **Existing Organisation**. Rename it in Organisation settings if needed.

Apply yourself (this changes the database):

```powershell
cd backend\CareHome.Api
dotnet ef database update
```

New customers after this point are onboarded with `POST /api/platform/tenants`. They do not share invoice categories or sequences with tenant 1.

Leftover Sovereign / Care Pro / Ampersand strings in old `Migrations/*.cs` and Designer files are **migration compatibility**, not product seed.
